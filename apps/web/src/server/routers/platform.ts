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
      db.from('tenants').select('id, status, created_at, updated_at'),
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

    // Churn: tenants que fueron cancelados en los últimos 30 días (usa updated_at como proxy de fecha de cancelación)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const churnedRecent = tenants.filter(
      (t) => t.status === 'cancelled' && (t.updated_at ?? t.created_at ?? '') > thirtyDaysAgo,
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

      const [usersRes, lastActivityRes] = await Promise.all([
        db
          .from('users')
          .select('id, status')
          .eq('tenant_id', input.id)
          .neq('role', 'platform_admin'),
        db
          .from('audit_logs')
          .select('occurred_at')
          .eq('tenant_id', input.id)
          .order('occurred_at', { ascending: false })
          .limit(1),
      ])

      const allUsers = usersRes.data ?? []
      const activeUsers = allUsers.filter((u) => u.status === 'active').length
      const totalSeats =
        (data.licenses as Array<{ seats_total: number; status: string }>)?.find(
          (l) => l.status === 'active' || l.status === 'trial',
        )?.seats_total ?? 0
      const lastActivity = lastActivityRes.data?.[0]?.occurred_at ?? null

      return {
        ...data,
        activeUserCount: activeUsers,
        totalUserCount: allUsers.length,
        totalSeats,
        seatUtilization: totalSeats > 0 ? Math.round((activeUsers / totalSeats) * 100) : 0,
        lastActivity,
      }
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

  // ─── DATOS DE CRECIMIENTO ────────────────────────────────────────────────
  getGrowthData: platformAdminProcedure.query(async ({ ctx }) => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const { data: tenants } = await ctx.db
      .from('tenants')
      .select('created_at, status')
      .gte('created_at', sixMonthsAgo.toISOString())

    // Agrupar por mes
    const countMap: Record<string, number> = {}
    for (const t of tenants ?? []) {
      const key = (t.created_at ?? '').slice(0, 7)
      if (key) countMap[key] = (countMap[key] ?? 0) + 1
    }

    // Generar los últimos 6 meses (incluye meses con 0 registros)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
      return { key, label, nuevos: countMap[key] ?? 0 }
    })

    return months
  }),

  // ─── TENANTS EN RIESGO ───────────────────────────────────────────────────
  getAtRiskTenants: platformAdminProcedure.query(async ({ ctx }) => {
    const db = ctx.db
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const nowIso = now.toISOString()

    const { data: licenses } = await db
      .from('licenses')
      .select(
        `id, status, seats_total, trial_ends_at, ends_at, updated_at,
         tenant_id,
         tenants(id, legal_name, trade_name, status, updated_at),
         plans(code, name)`,
      )
      .in('status', ['trial', 'active', 'suspended'])

    if (!licenses)
      return { trialExpiringSoon: [], trialExpired: [], suspended: [], licenseExpired: [] }

    type LicRow = (typeof licenses)[number]
    type TenantRef = {
      id: string
      legal_name: string
      trade_name: string | null
      status: string
      updated_at: string | null
    } | null
    type PlanRef = { code: string; name: string } | null

    const toEntry = (l: LicRow) => ({
      tenantId: l.tenant_id,
      tenantName:
        (l.tenants as TenantRef)?.trade_name ?? (l.tenants as TenantRef)?.legal_name ?? '—',
      planName: (l.plans as PlanRef)?.name ?? '—',
      seats: l.seats_total,
      trialEndsAt: l.trial_ends_at,
      endsAt: l.ends_at,
      daysLeft: l.trial_ends_at
        ? Math.ceil((new Date(l.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    })

    const trialExpiringSoon = licenses
      .filter(
        (l) =>
          l.status === 'trial' &&
          l.trial_ends_at !== null &&
          l.trial_ends_at > nowIso &&
          l.trial_ends_at <= in7Days,
      )
      .map(toEntry)

    const trialExpired = licenses
      .filter((l) => l.status === 'trial' && l.trial_ends_at !== null && l.trial_ends_at <= nowIso)
      .map(toEntry)

    const suspended = licenses
      .filter((l) => (l.tenants as TenantRef)?.status === 'suspended')
      .map((l) => ({
        ...toEntry(l),
        suspendedAt: (l.tenants as TenantRef)?.updated_at ?? null,
      }))

    const licenseExpired = licenses
      .filter((l) => l.status === 'active' && l.ends_at !== null && l.ends_at <= nowIso)
      .map(toEntry)

    return { trialExpiringSoon, trialExpired, suspended, licenseExpired }
  }),

  // ─── EXTENDER TRIAL ──────────────────────────────────────────────────────
  extendTrial: platformAdminProcedure
    .input(z.object({ tenantId: z.string().uuid(), days: z.number().int().min(1).max(365) }))
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db
      const { data: license, error } = await db
        .from('licenses')
        .select('id, trial_ends_at, ends_at, status')
        .eq('tenant_id', input.tenantId)
        .in('status', ['trial', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !license)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Licencia no encontrada' })

      const baseDate = new Date(license.trial_ends_at ?? license.ends_at ?? new Date())
      if (baseDate < new Date()) baseDate.setTime(Date.now())
      baseDate.setDate(baseDate.getDate() + input.days)
      const newDate = baseDate.toISOString()

      await db
        .from('licenses')
        .update({
          trial_ends_at: license.trial_ends_at ? newDate : null,
          ends_at: newDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', license.id)

      await db.from('audit_logs').insert({
        actor_user_id: ctx.user.sub,
        action: 'license.updated',
        entity_type: 'license',
        entity_id: license.id,
        after_state: { extended_days: input.days, new_end_date: newDate } as unknown as AuditJson,
      })

      return { success: true, newEndDate: newDate }
    }),

  // ─── NOTAS INTERNAS ───────────────────────────────────────────────────────
  getTenantNotes: platformAdminProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { data, error } = await ctx.db
        .from('tenant_notes')
        .select('id, content, created_at, author_id, users(full_name, email)')
        .eq('tenant_id', input.tenantId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  createTenantNote: platformAdminProcedure
    .input(z.object({ tenantId: z.string().uuid(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.db.from('tenant_notes').insert({
        tenant_id: input.tenantId,
        content: input.content.trim(),
        author_id: ctx.user.sub,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  deleteTenantNote: platformAdminProcedure
    .input(z.object({ noteId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.db.from('tenant_notes').delete().eq('id', input.noteId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  // ─── BÚSQUEDA DE USUARIOS ────────────────────────────────────────────────
  searchUsers: platformAdminProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const db = ctx.db
      const offset = (input.page - 1) * input.pageSize
      const q = `%${input.query}%`

      const { data, count, error } = await db
        .from('users')
        .select(
          `id, full_name, email, role, status, created_at,
           tenant_id, tenants(legal_name, trade_name)`,
          { count: 'exact' },
        )
        .neq('role', 'platform_admin')
        .or(`full_name.ilike.${q},email.ilike.${q}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + input.pageSize - 1)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { data: data ?? [], total: count ?? 0, page: input.page, pageSize: input.pageSize }
    }),

  // ─── MODO MANTENIMIENTO ───────────────────────────────────────────────────
  toggleMaintenanceMode: platformAdminProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        enabled: z.boolean(),
        message: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.db
        .from('tenants')
        .update({
          maintenance_mode: input.enabled,
          maintenance_message: input.enabled ? (input.message ?? null) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.tenantId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await ctx.db.from('audit_logs').insert({
        actor_user_id: ctx.user.sub,
        action: 'tenant.updated',
        entity_type: 'tenant',
        entity_id: input.tenantId,
        after_state: {
          maintenance_mode: input.enabled,
          maintenance_message: input.message,
        } as unknown as AuditJson,
      })

      return { success: true }
    }),

  // ─── ACCIONES EN MASA ────────────────────────────────────────────────────
  bulkExtendTrial: platformAdminProcedure
    .input(
      z.object({
        tenantIds: z.array(z.string().uuid()).min(1).max(50),
        days: z.number().int().min(1).max(365),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const results = await Promise.allSettled(
        input.tenantIds.map(async (tenantId) => {
          const { data: license } = await ctx.db
            .from('licenses')
            .select('id, trial_ends_at, ends_at')
            .eq('tenant_id', tenantId)
            .in('status', ['trial', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (!license) return

          const base = new Date(license.trial_ends_at ?? license.ends_at ?? new Date())
          const newDate = new Date(base)
          newDate.setDate(newDate.getDate() + input.days)
          const newIso = newDate.toISOString()

          await ctx.db
            .from('licenses')
            .update({
              trial_ends_at: newIso,
              ends_at: newIso,
              updated_at: new Date().toISOString(),
            })
            .eq('id', license.id)
        }),
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      return { success: true, processed: input.tenantIds.length, failed }
    }),

  // ─── TIMELINE DEL TENANT ─────────────────────────────────────────────────
  getTenantTimeline: platformAdminProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { data, error } = await ctx.db
        .from('audit_logs')
        .select('id, action, occurred_at, after_state, actor_user_id')
        .eq('entity_id', input.tenantId)
        .order('occurred_at', { ascending: false })
        .limit(30)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // ─── EMAIL AL ADMIN DEL TENANT ───────────────────────────────────────────
  sendEmailToTenant: platformAdminProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Buscar tenant admin
      const { data: admin, error: adminErr } = await ctx.db
        .from('users')
        .select('id, email, full_name')
        .eq('tenant_id', input.tenantId)
        .eq('role', 'tenant_admin')
        .eq('status', 'active')
        .single()

      if (adminErr || !admin)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No hay tenant_admin activo' })

      const { data: tenant } = await ctx.db
        .from('tenants')
        .select('legal_name, trade_name')
        .eq('id', input.tenantId)
        .single()

      const { sendPlatformEmail } = await import('@/lib/email')
      const sent = await sendPlatformEmail({
        to: admin.email,
        subject: input.subject,
        recipientName: admin.full_name ?? admin.email,
        body: input.body,
        tenantName: tenant?.trade_name ?? tenant?.legal_name ?? '',
      })

      if (!sent)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No se pudo enviar el email',
        })

      await ctx.db.from('audit_logs').insert({
        actor_user_id: ctx.user.sub,
        action: 'tenant.updated',
        entity_type: 'tenant',
        entity_id: input.tenantId,
        after_state: { email_sent_to: admin.email, subject: input.subject } as unknown as AuditJson,
      })

      return { success: true, sentTo: admin.email }
    }),

  // ─── DATOS DE REVENUE ─────────────────────────────────────────────────────
  getRevenueData: platformAdminProcedure.query(async ({ ctx }) => {
    const db = ctx.db

    const [licensesRes, plansRes, tenantsRes] = await Promise.all([
      db
        .from('licenses')
        .select('id, tenant_id, status, seats_total, plan_id, starts_at, ends_at')
        .in('status', ['active', 'trial']),
      db.from('plans').select('id, code, name, monthly_price_per_seat_cop'),
      db.from('tenants').select('id, legal_name, trade_name, status'),
    ])

    const licenses = licensesRes.data ?? []
    const plans = plansRes.data ?? []
    const tenants = tenantsRes.data ?? []

    const planMap = Object.fromEntries(plans.map((p) => [p.id, p]))
    const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t]))

    const byPlan = plans.map((plan) => {
      const planLicenses = licenses.filter((l) => l.plan_id === plan.id && l.status === 'active')
      const seats = planLicenses.reduce((s, l) => s + (l.seats_total ?? 0), 0)
      const mrr = seats * (plan.monthly_price_per_seat_cop ?? 0)
      return {
        planId: plan.id,
        planName: plan.name,
        planCode: plan.code,
        seats,
        mrr,
        count: planLicenses.length,
      }
    })

    const activeLicenses = licenses.filter((l) => l.status === 'active')
    const totalMrr = activeLicenses.reduce((sum, l) => {
      const plan = planMap[l.plan_id ?? '']
      return sum + (l.seats_total ?? 0) * (plan?.monthly_price_per_seat_cop ?? 0)
    }, 0)

    const topTenants = activeLicenses
      .map((l) => {
        const plan = planMap[l.plan_id ?? '']
        const tenant = tenantMap[l.tenant_id ?? '']
        const mrr = (l.seats_total ?? 0) * (plan?.monthly_price_per_seat_cop ?? 0)
        return {
          tenantId: l.tenant_id,
          tenantName: tenant?.trade_name ?? tenant?.legal_name ?? '—',
          mrr,
          seats: l.seats_total ?? 0,
          planName: plan?.name ?? '—',
        }
      })
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 10)

    return { totalMrr, byPlan, topTenants }
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
        action: 'tenant.impersonated',
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
