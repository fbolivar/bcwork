import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, platformAdminProcedure } from '../trpc'
import type { Database } from '@bcwork/db'

type AuditJson = Database['public']['Tables']['audit_logs']['Row']['before_state']

export const platformRouter = router({
  // ─── MÉTRICAS GLOBALES ────────────────────────────────────────────────────
  getMetrics: platformAdminProcedure.query(async ({ ctx }) => {
    const db = ctx.db

    const [tenantsRes, licensesRes, usersRes] = await Promise.all([
      db.from('tenants').select('id, status, created_at'),
      db.from('licenses').select('id, tenant_id, status, seats_total, plan_id, starts_at'),
      db.from('users').select('id, tenant_id, status').neq('role', 'platform_admin'),
    ])

    const tenants = tenantsRes.data ?? []
    const licenses = licensesRes.data ?? []
    const users = usersRes.data ?? []

    // Obtener precios de planes para calcular MRR
    const { data: plans } = await db.from('plans').select('id, code, monthly_price_per_seat_cop')

    const priceMap = Object.fromEntries(
      (plans ?? []).map((p) => [p.id, p.monthly_price_per_seat_cop]),
    )

    const activeLicenses = licenses.filter((l) => l.status === 'active')
    const trialLicenses = licenses.filter((l) => l.status === 'trial')

    const mrr = activeLicenses.reduce((sum, l) => {
      const price = priceMap[l.plan_id] ?? 0
      return sum + price * l.seats_total
    }, 0)

    // Churn: tenants cancelados en los últimos 30 días
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const churnedRecent = tenants.filter(
      (t) => t.status === 'cancelled' && (t.created_at ?? '') > thirtyDaysAgo,
    ).length

    const activeUsers = users.filter((u) => u.status === 'active' && u.tenant_id !== null).length

    return {
      totalTenants: tenants.length,
      activeTenants: tenants.filter((t) => t.status === 'active').length,
      trialTenants: tenants.filter((t) => t.status === 'trial').length,
      suspendedTenants: tenants.filter((t) => t.status === 'suspended').length,
      mrrCop: mrr,
      totalSeats: activeLicenses.reduce((s, l) => s + l.seats_total, 0),
      trialSeats: trialLicenses.reduce((s, l) => s + l.seats_total, 0),
      activeUsers,
      churnedLast30Days: churnedRecent,
    }
  }),

  // ─── CREAR TENANT ────────────────────────────────────────────────────────
  createTenant: platformAdminProcedure
    .input(
      z.object({
        legal_name: z.string().min(2).max(200),
        trade_name: z.string().max(200).optional(),
        nit: z.string().regex(/^\d{9,10}-\d$/, 'NIT inválido (formato: 900123456-7)'),
        contact_email: z.string().email(),
        contact_phone: z.string().max(20).optional(),
        timezone: z.string().default('America/Bogota'),
        admin_full_name: z.string().min(2).max(200),
        admin_password: z.string().min(12),
        plan_code: z.enum(['basic', 'pro', 'enterprise', 'custom']).default('pro'),
        seats: z.number().int().min(1).max(5000).default(10),
        status: z.enum(['trial', 'active']).default('trial'),
        trial_days: z.number().int().min(1).max(365).default(14),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db

      const { hashPassword, validatePasswordPolicy } = await import('@/lib/auth/password')
      const { ROLES } = await import('@bcwork/shared')
      const { getDb } = await import('@/lib/db')
      const adminDb = getDb()

      const policyError = validatePasswordPolicy(input.admin_password)
      if (policyError) throw new TRPCError({ code: 'BAD_REQUEST', message: policyError })

      // Verificar email no duplicado
      const { data: existing } = await adminDb
        .from('users')
        .select('id')
        .eq('email', input.contact_email)
        .maybeSingle()
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Email ya registrado' })

      const { data: plan } = await adminDb
        .from('plans')
        .select('id')
        .eq('code', input.plan_code)
        .single()
      if (!plan) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan no encontrado' })

      const passwordHash = await hashPassword(input.admin_password)

      const { data: tenant, error: tenantError } = await adminDb
        .from('tenants')
        .insert({
          legal_name: input.legal_name,
          trade_name: input.trade_name ?? null,
          nit: input.nit,
          timezone: input.timezone,
          contact_email: input.contact_email,
          contact_phone: input.contact_phone ?? null,
          status: input.status,
        })
        .select('id')
        .single()

      if (tenantError) {
        if (tenantError.code === '23505')
          throw new TRPCError({ code: 'CONFLICT', message: 'NIT ya registrado' })
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: tenantError.message })
      }

      const isPerpetual = input.plan_code === 'custom'
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + input.trial_days)

      await adminDb.from('licenses').insert({
        tenant_id: tenant.id,
        plan_id: plan.id,
        seats_total: input.seats,
        status: isPerpetual ? 'active' : input.status,
        starts_at: new Date().toISOString(),
        ends_at: isPerpetual ? null : trialEnd.toISOString(),
        trial_ends_at: !isPerpetual && input.status === 'trial' ? trialEnd.toISOString() : null,
      })

      const { data: user, error: userError } = await adminDb
        .from('users')
        .insert({
          tenant_id: tenant.id,
          email: input.contact_email,
          password_hash: passwordHash,
          full_name: input.admin_full_name,
          role: ROLES.TENANT_ADMIN,
          status: 'active',
        })
        .select('id')
        .single()

      if (userError)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: userError.message })

      await adminDb.from('password_history').insert({
        user_id: user.id,
        tenant_id: tenant.id,
        password_hash: passwordHash,
      })

      await db.from('audit_logs').insert({
        actor_user_id: ctx.user.sub,
        action: 'tenant.created',
        entity_type: 'tenant',
        entity_id: tenant.id,
        after_state: { legal_name: input.legal_name, plan: input.plan_code, seats: input.seats },
      })

      return { tenantId: tenant.id, adminUserId: user.id }
    }),

  // ─── TENANTS ──────────────────────────────────────────────────────────────
  listTenants: platformAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(['trial', 'active', 'suspended', 'cancelled', 'all']).default('all'),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const db = ctx.db
      const offset = (input.page - 1) * input.pageSize

      let query = db
        .from('tenants')
        .select(
          `id, legal_name, trade_name, nit, contact_email, status, created_at,
           licenses(id, status, seats_total, plan_id, ends_at, trial_ends_at,
             plans(code, name, monthly_price_per_seat_cop))`,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + input.pageSize - 1)

      if (input.status !== 'all') {
        query = query.eq('status', input.status)
      }
      if (input.search) {
        query = query.or(
          `legal_name.ilike.%${input.search}%,nit.ilike.%${input.search}%,contact_email.ilike.%${input.search}%`,
        )
      }

      const { data, count, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { data: data ?? [], total: count ?? 0, page: input.page, pageSize: input.pageSize }
    }),

  getTenant: platformAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const db = ctx.db
      const { data, error } = await db
        .from('tenants')
        .select(`*, licenses(*, plans(code, name, monthly_price_per_seat_cop))`)
        .eq('id', input.id)
        .single()

      if (error || !data) throw new TRPCError({ code: 'NOT_FOUND' })

      // Contar usuarios activos
      const { count: userCount } = await db
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', input.id)
        .eq('status', 'active')

      return { ...data, activeUserCount: userCount ?? 0 }
    }),

  updateTenant: platformAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        trade_name: z.string().max(200).optional(),
        contact_email: z.string().email().optional(),
        contact_phone: z.string().max(20).optional(),
        timezone: z.string().optional(),
        data_retention_months: z.number().int().min(1).max(120).optional(),
        data_protection_officer: z.string().optional(),
        status: z.enum(['active', 'suspended', 'cancelled', 'trial']).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db
      const { id, ...rawUpdates } = input
      // Strip undefined so Supabase doesn't overwrite existing values with null
      const updates = Object.fromEntries(
        Object.entries(rawUpdates).filter(([, v]) => v !== undefined),
      )

      const { error } = await db
        .from('tenants')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')

      if (error) {
        console.error('[platform] updateTenant error:', error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      await ctx.db.from('audit_logs').insert({
        actor_user_id: ctx.user.sub,
        action: 'tenant.updated',
        entity_type: 'tenant',
        entity_id: id,
        after_state: updates,
      })

      return { success: true }
    }),

  // ─── LICENCIAS ────────────────────────────────────────────────────────────
  updateLicense: platformAdminProcedure
    .input(
      z.object({
        licenseId: z.string().uuid(),
        status: z.enum(['active', 'suspended', 'cancelled']).optional(),
        seats_total: z.number().int().min(1).optional(),
        plan_id: z.string().uuid().optional(),
        ends_at: z.string().datetime().nullable().optional(),
        feature_overrides: z.record(z.boolean()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db
      const { licenseId, ...rawUpdates } = input
      const updates = Object.fromEntries(
        Object.entries(rawUpdates).filter(([, v]) => v !== undefined),
      )

      const { data: before } = await db.from('licenses').select('*').eq('id', licenseId).single()

      const { error } = await db
        .from('licenses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', licenseId)
        .select('id')

      if (error) {
        console.error('[platform] updateLicense error:', error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      await db.from('audit_logs').insert({
        tenant_id: before?.tenant_id,
        actor_user_id: ctx.user.sub,
        action: 'license.updated',
        entity_type: 'license',
        entity_id: licenseId,
        before_state: before as unknown as AuditJson,
        after_state: updates as unknown as AuditJson,
      })

      return { success: true }
    }),

  // ─── PLANES ───────────────────────────────────────────────────────────────
  listPlans: platformAdminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('plans')
      .select('*')
      .order('monthly_price_per_seat_cop')

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  updatePlan: platformAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(2).max(100).optional(),
        monthly_price_per_seat_cop: z.number().min(0).optional(),
        features: z.record(z.boolean()).optional(),
        is_active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db
      const { id, ...updates } = input

      const { error } = await db.from('plans').update(updates).eq('id', id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await db.from('audit_logs').insert({
        actor_user_id: ctx.user.sub,
        action: 'license.updated',
        entity_type: 'plan',
        entity_id: id,
        after_state: updates,
      })

      return { success: true }
    }),

  // ─── AUDIT LOGS GLOBALES ─────────────────────────────────────────────────
  listAuditLogs: platformAdminProcedure
    .input(
      z.object({
        tenantId: z.string().uuid().optional(),
        action: z.string().optional(),
        fromDate: z.string().datetime().optional(),
        toDate: z.string().datetime().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      const db = ctx.db
      const offset = (input.page - 1) * input.pageSize

      let query = db
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('occurred_at', { ascending: false })
        .range(offset, offset + input.pageSize - 1)

      if (input.tenantId) query = query.eq('tenant_id', input.tenantId)
      if (input.action) query = query.ilike('action', `%${input.action}%`)
      if (input.fromDate) query = query.gte('occurred_at', input.fromDate)
      if (input.toDate) query = query.lte('occurred_at', input.toDate)

      const { data, count, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { data: data ?? [], total: count ?? 0, page: input.page, pageSize: input.pageSize }
    }),

  // ─── IMPERSONACIÓN ────────────────────────────────────────────────────────
  impersonateTenant: platformAdminProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { signAccessToken } = await import('@/lib/auth/jwt')

      // Buscar el tenant_admin de este tenant
      const { data: adminUser, error } = await ctx.db
        .from('users')
        .select('id, email, role')
        .eq('tenant_id', input.tenantId)
        .eq('role', 'tenant_admin')
        .eq('status', 'active')
        .single()

      if (error || !adminUser)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No hay tenant_admin activo para esta empresa',
        })

      // Token de 1 hora con flag de impersonación
      const token = await signAccessToken({
        sub: adminUser.id,
        tid: input.tenantId,
        role: 'tenant_admin',
        email: adminUser.email,
        imp: true,
      } as Parameters<typeof signAccessToken>[0] & { imp: boolean })

      // Auditoría
      await ctx.db.from('audit_logs').insert({
        actor_user_id: ctx.user.sub,
        action: 'tenant.created', // reuse closest available action
        entity_type: 'tenant',
        entity_id: input.tenantId,
        after_state: {
          impersonated_as: adminUser.email,
          by: ctx.user.email,
        } as unknown as AuditJson,
      })

      return { token }
    }),
})
