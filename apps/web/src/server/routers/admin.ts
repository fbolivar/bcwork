import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '../trpc'
import { hashPassword, generateRandomPassword } from '@/lib/auth/password'
import { logAudit } from '@/lib/auth/audit'

export const adminRouter = router({
  // ─── Dashboard ────────────────────────────────────────────────────────────

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid

    const [usersRes, teamsRes, schedulesRes, licenseRes, sessionsRes, tenantRes] =
      await Promise.all([
        ctx.db
          .from('users')
          .select('id, status')
          .eq('tenant_id', tenantId)
          .neq('status', 'deleted'),
        ctx.db.from('teams').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        ctx.db
          .from('work_schedules')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        ctx.db
          .from('licenses')
          .select('seats_total, status')
          .eq('tenant_id', tenantId)
          .in('status', ['active', 'trial'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        ctx.db
          .from('work_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .is('ended_at', null),
        ctx.db.from('tenants').select('onboarding_complete').eq('id', tenantId).single(),
      ])

    const users = usersRes.data ?? []
    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.status === 'active').length,
      teamsCount: teamsRes.count ?? 0,
      schedulesCount: schedulesRes.count ?? 0,
      licenseSeats: licenseRes.data?.seats_total ?? 0,
      licenseStatus: licenseRes.data?.status ?? 'none',
      activeSessions: sessionsRes.count ?? 0,
      onboardingComplete: tenantRes.data?.onboarding_complete ?? false,
    }
  }),

  // ─── Usuarios ─────────────────────────────────────────────────────────────

  listUsers: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(['tenant_admin', 'manager', 'employee', 'all']).default('all'),
        status: z.enum(['active', 'disabled', 'all']).default('all'),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const from = (input.page - 1) * input.pageSize

      let query = ctx.db
        .from('users')
        .select(
          'id, email, full_name, role, status, department, position, mfa_enabled, last_login_at, created_at, must_change_password',
          { count: 'exact' },
        )
        .eq('tenant_id', tenantId)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

      if (input.search) {
        query = query.or(`email.ilike.%${input.search}%,full_name.ilike.%${input.search}%`)
      }
      if (input.role !== 'all') query = query.eq('role', input.role)
      if (input.status !== 'all') query = query.eq('status', input.status)

      const { data, count, error } = await query.range(from, from + input.pageSize - 1)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { data: data ?? [], total: count ?? 0, page: input.page, pageSize: input.pageSize }
    }),

  inviteUser: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        full_name: z.string().min(2).max(100),
        role: z.enum(['manager', 'employee']),
        department: z.string().max(100).optional(),
        position: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid

      const { data: existing } = await ctx.db
        .from('users')
        .select('id')
        .eq('email', input.email.toLowerCase())
        .neq('status', 'deleted')
        .limit(1)
        .maybeSingle()

      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Email ya registrado' })

      const { data: license } = await ctx.db
        .from('licenses')
        .select('seats_total')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count: currentCount } = await ctx.db
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active')

      if (license && (currentCount ?? 0) >= license.seats_total) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Límite de seats alcanzado' })
      }

      const tempPassword = generateRandomPassword()
      const passwordHash = await hashPassword(tempPassword)

      const insertData: Record<string, unknown> = {
        tenant_id: tenantId,
        email: input.email.toLowerCase(),
        full_name: input.full_name,
        role: input.role,
        password_hash: passwordHash,
        must_change_password: true,
        status: 'active',
      }
      if (input.department) insertData['department'] = input.department
      if (input.position) insertData['position'] = input.position

      const { data: newUser, error } = await ctx.db
        .from('users')
        .insert(insertData)
        .select('id, email')
        .single()

      if (error ?? !newUser)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error creando usuario' })

      await ctx.db
        .from('password_history')
        .insert({ user_id: newUser.id, tenant_id: tenantId, password_hash: passwordHash })

      await logAudit(ctx.db, {
        tenantId: tenantId,
        actorUserId: ctx.user!.sub,
        action: 'user.invited',
        entityType: 'user',
        entityId: newUser.id,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
        after: { email: input.email, role: input.role },
      })

      return { id: newUser.id, email: newUser.email, tempPassword }
    }),

  updateUser: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        full_name: z.string().min(2).max(100).optional(),
        role: z.enum(['manager', 'employee']).optional(),
        status: z.enum(['active', 'disabled']).optional(),
        department: z.string().max(100).optional(),
        position: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const tenantId = ctx.user!.tid
      const updates = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined))

      const { error } = await ctx.db
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .neq('role', 'platform_admin')

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await logAudit(ctx.db, {
        tenantId: tenantId,
        actorUserId: ctx.user!.sub,
        action: 'user.updated',
        entityType: 'user',
        entityId: id,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
        after: updates,
      })

      return { ok: true }
    }),

  // ─── Equipos ──────────────────────────────────────────────────────────────

  listTeams: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const from = (input.page - 1) * input.pageSize

      const { data, count, error } = await ctx.db
        .from('teams')
        .select('id, name, description, created_at', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .range(from, from + input.pageSize - 1)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { data: data ?? [], total: count ?? 0, page: input.page, pageSize: input.pageSize }
    }),

  createTeam: adminProcedure
    .input(
      z.object({ name: z.string().min(1).max(100), description: z.string().max(500).optional() }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const insertData: Record<string, unknown> = { tenant_id: tenantId, name: input.name }
      if (input.description) insertData['description'] = input.description

      const { data, error } = await ctx.db
        .from('teams')
        .insert(insertData)
        .select('id, name')
        .single()

      if (error ?? !data)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Error' })

      await logAudit(ctx.db, {
        tenantId: tenantId,
        actorUserId: ctx.user!.sub,
        action: 'team.created',
        entityType: 'team',
        entityId: data.id,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
        after: { name: input.name },
      })

      return data
    }),

  updateTeam: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const updates = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined))
      const { error } = await ctx.db
        .from('teams')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteTeam: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      await ctx.db.from('team_members').delete().eq('team_id', input.id).eq('tenant_id', tenantId)
      const { error } = await ctx.db
        .from('teams')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', tenantId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await logAudit(ctx.db, {
        tenantId: tenantId,
        actorUserId: ctx.user!.sub,
        action: 'team.deleted',
        entityType: 'team',
        entityId: input.id,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
      })

      return { ok: true }
    }),

  listTeamMembers: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('team_members')
        .select('user_id, role, joined_at, users(id, email, full_name, role, department, position)')
        .eq('team_id', input.teamId)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  addTeamMember: adminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(['lead', 'member']).default('member'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from('team_members').upsert(
        {
          team_id: input.teamId,
          user_id: input.userId,
          tenant_id: ctx.user!.tid,
          role: input.role,
        },
        { onConflict: 'team_id,user_id' },
      )
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  removeTeamMember: adminProcedure
    .input(z.object({ teamId: z.string().uuid(), userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('team_members')
        .delete()
        .eq('team_id', input.teamId)
        .eq('user_id', input.userId)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Horarios ─────────────────────────────────────────────────────────────

  listSchedules: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('work_schedules')
      .select(
        'id, name, timezone, days_of_week, start_time, end_time, disconnection_grace_minutes, created_at',
      )
      .eq('tenant_id', ctx.user!.tid)
      .order('name', { ascending: true })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createSchedule: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        timezone: z.string(),
        days_of_week: z.array(z.number().int().min(0).max(6)),
        start_time: z.string().regex(/^\d{2}:\d{2}$/),
        end_time: z.string().regex(/^\d{2}:\d{2}$/),
        disconnection_grace_minutes: z.number().int().min(0).max(120).default(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('work_schedules')
        .insert({ ...input, tenant_id: ctx.user!.tid })
        .select('id, name')
        .single()

      if (error ?? !data)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Error' })
      return data
    }),

  updateSchedule: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        timezone: z.string().optional(),
        days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
        start_time: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        end_time: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        disconnection_grace_minutes: z.number().int().min(0).max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const updates = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined))
      const { error } = await ctx.db
        .from('work_schedules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteSchedule: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      await ctx.db
        .from('user_schedules')
        .delete()
        .eq('schedule_id', input.id)
        .eq('tenant_id', tenantId)
      const { error } = await ctx.db
        .from('work_schedules')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  assignSchedule: adminProcedure
    .input(z.object({ userId: z.string().uuid(), scheduleId: z.string().uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const today = new Date().toISOString().split('T')[0]!

      await ctx.db
        .from('user_schedules')
        .update({ effective_to: today })
        .eq('user_id', input.userId)
        .eq('tenant_id', tenantId)
        .is('effective_to', null)

      if (input.scheduleId) {
        await ctx.db.from('user_schedules').insert({
          user_id: input.userId,
          tenant_id: tenantId,
          schedule_id: input.scheduleId,
          effective_from: today,
        })
      }
      return { ok: true }
    }),

  // ─── Catálogo de apps ─────────────────────────────────────────────────────

  listAppRules: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid
    const { data, error } = await ctx.db
      .from('app_catalog')
      .select('id, name, process_name, category, rule, tenant_id, created_at')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  upsertAppRule: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(100),
        process_name: z.string().max(200).optional(),
        category: z.string().max(50),
        rule: z.enum(['allow', 'block', 'monitor']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { id, ...rest } = input
      const payload = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined))

      if (id) {
        const { error } = await ctx.db
          .from('app_catalog')
          .update(payload)
          .eq('id', id)
          .eq('tenant_id', tenantId)
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      } else {
        const { error } = await ctx.db
          .from('app_catalog')
          .insert({ ...payload, tenant_id: tenantId })
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return { ok: true }
    }),

  deleteAppRule: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('app_catalog')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Rangos IP corporativos ────────────────────────────────────────────────

  listIpRanges: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('corporate_ip_ranges')
      .select('id, cidr, label, created_at')
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  addIpRange: adminProcedure
    .input(
      z.object({
        cidr: z
          .string()
          .regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, 'CIDR inválido (ej: 192.168.1.0/24)'),
        label: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { data, error } = await ctx.db
        .from('corporate_ip_ranges')
        .insert({ tenant_id: tenantId, cidr: input.cidr, label: input.label })
        .select('id')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await logAudit(ctx.db, {
        tenantId: tenantId,
        actorUserId: ctx.user!.sub,
        action: 'ip_range.added',
        entityType: 'ip_range',
        entityId: data?.id ?? '',
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
        after: { cidr: input.cidr, label: input.label },
      })
      return { ok: true }
    }),

  removeIpRange: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('corporate_ip_ranges')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Configuración del tenant ─────────────────────────────────────────────

  getSettings: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('tenants')
      .select(
        'legal_name, trade_name, nit, contact_email, contact_phone, timezone, data_retention_months, data_protection_officer, onboarding_complete',
      )
      .eq('id', ctx.user!.tid)
      .single()

    if (error ?? !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa no encontrada' })
    return data
  }),

  updateSettings: adminProcedure
    .input(
      z.object({
        trade_name: z.string().max(200).optional(),
        contact_email: z.string().email().optional(),
        contact_phone: z.string().max(20).optional(),
        timezone: z.string().optional(),
        data_retention_months: z.number().int().min(12).max(84).optional(),
        data_protection_officer: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const updates = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))

      const { error } = await ctx.db
        .from('tenants')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', tenantId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await logAudit(ctx.db, {
        tenantId: tenantId,
        actorUserId: ctx.user!.sub,
        action: 'tenant.settings_updated',
        entityType: 'tenant',
        entityId: tenantId,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
        after: updates,
      })
      return { ok: true }
    }),

  completeOnboarding: adminProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user!.tid

    const { error } = await ctx.db
      .from('tenants')
      .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
      .eq('id', tenantId)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    await logAudit(ctx.db, {
      tenantId: tenantId,
      actorUserId: ctx.user!.sub,
      action: 'tenant.onboarding_completed',
      entityType: 'tenant',
      entityId: tenantId,
      ipInet: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return { ok: true }
  }),

  // ─── Reglas de dominio (extensión) ───────────────────────────────────────

  getDomainRules: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('app_rules')
      .select('identifier, productivity, rule_type')
      .eq('tenant_id', ctx.user!.tid)
      .eq('rule_type', 'domain')
      .order('created_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    // Devolver mapa domain → productivity para facilitar uso en extensión
    const rules: Record<string, string> = {}
    for (const row of data ?? []) {
      rules[row.identifier] = row.productivity
    }
    return rules
  }),

  // ─── Agent Devices ────────────────────────────────────────────────────────

  generateEnrollmentCode: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

      // Invalidar códigos anteriores del usuario
      await ctx.db
        .from('enrollment_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('user_id', input.userId)
        .is('used_at', null)

      // Código de 8 chars alfanumérico mayúsculas
      const { randomBytes } = await import('crypto')
      const code = randomBytes(5).toString('base64url').toUpperCase().slice(0, 8)

      const { data, error } = await ctx.db
        .from('enrollment_codes')
        .insert({
          tenant_id: tenantId,
          user_id: input.userId,
          code,
          expires_at: expiresAt.toISOString(),
        })
        .select('id, code, expires_at')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { code: data.code, expiresAt: data.expires_at }
    }),

  listDevices: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const offset = (input.page - 1) * input.pageSize

      let query = ctx.db
        .from('agent_devices')
        .select('id, user_id, name, platform, hostname, enrolled_at, last_seen_at, revoked_at', {
          count: 'exact',
        })
        .eq('tenant_id', tenantId)
        .order('enrolled_at', { ascending: false })
        .range(offset, offset + input.pageSize - 1)

      if (input.userId) {
        query = query.eq('user_id', input.userId)
      }

      const { data, error, count } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { data: data ?? [], total: count ?? 0, page: input.page, pageSize: input.pageSize }
    }),

  revokeDevice: adminProcedure
    .input(z.object({ deviceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid

      const { data: device, error: fetchErr } = await ctx.db
        .from('agent_devices')
        .select('id, user_id')
        .eq('id', input.deviceId)
        .eq('tenant_id', tenantId)
        .is('revoked_at', null)
        .single()

      if (fetchErr || !device)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Dispositivo no encontrado' })

      const { error } = await ctx.db
        .from('agent_devices')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', input.deviceId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Revocar api_keys asociadas al dispositivo
      await ctx.db
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('user_id', device.user_id)
        .eq('name', `agent:${input.deviceId}`)
        .is('revoked_at', null)

      await logAudit(ctx.db, {
        tenantId: tenantId,
        actorUserId: ctx.user!.sub,
        action: 'device.revoked',
        entityType: 'agent_device',
        entityId: input.deviceId,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return { ok: true }
    }),

  // ─── Métricas y KPIs ─────────────────────────────────────────────────────

  getProductivityTrend: adminProcedure
    .input(
      z.object({
        days: z.number().int().min(7).max(90).default(30),
        userId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

      let query = ctx.db
        .from('daily_user_metrics')
        .select(
          'metric_date, active_seconds, productive_seconds, non_productive_seconds, productivity_ratio, focus_score, overtime_seconds',
        )
        .eq('tenant_id', tenantId)
        .gte('metric_date', from)
        .order('metric_date', { ascending: true })

      if (input.userId) {
        query = query.eq('user_id', input.userId)
      }

      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Si hay múltiples usuarios, agrupar por fecha y sumar
      if (!input.userId) {
        const byDate = new Map<
          string,
          {
            active: number
            productive: number
            non_productive: number
            overtime: number
            count: number
          }
        >()
        for (const row of data ?? []) {
          const existing = byDate.get(row.metric_date) ?? {
            active: 0,
            productive: 0,
            non_productive: 0,
            overtime: 0,
            count: 0,
          }
          byDate.set(row.metric_date, {
            active: existing.active + (row.active_seconds ?? 0),
            productive: existing.productive + (row.productive_seconds ?? 0),
            non_productive: existing.non_productive + (row.non_productive_seconds ?? 0),
            overtime: existing.overtime + (row.overtime_seconds ?? 0),
            count: existing.count + 1,
          })
        }
        return Array.from(byDate.entries()).map(([date, v]) => ({
          date,
          active_seconds: v.active,
          productive_seconds: v.productive,
          non_productive_seconds: v.non_productive,
          productivity_ratio: v.active > 0 ? v.productive / v.active : 0,
          overtime_seconds: v.overtime,
          user_count: v.count,
        }))
      }

      return (data ?? []).map((row) => ({
        date: row.metric_date,
        active_seconds: row.active_seconds ?? 0,
        productive_seconds: row.productive_seconds ?? 0,
        non_productive_seconds: row.non_productive_seconds ?? 0,
        productivity_ratio: Number(row.productivity_ratio ?? 0),
        focus_score: row.focus_score != null ? Number(row.focus_score) : null,
        overtime_seconds: row.overtime_seconds ?? 0,
        user_count: 1,
      }))
    }),

  getTopUsers: adminProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(7),
        metric: z
          .enum(['productivity_ratio', 'active_seconds', 'focus_score'])
          .default('productivity_ratio'),
        limit: z.number().int().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

      const { data: metrics, error } = await ctx.db
        .from('daily_user_metrics')
        .select(
          'user_id, active_seconds, productive_seconds, non_productive_seconds, focus_score, overtime_seconds',
        )
        .eq('tenant_id', tenantId)
        .gte('metric_date', from)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Agregar por usuario
      const byUser = new Map<
        string,
        {
          active: number
          productive: number
          non_productive: number
          focus: number[]
          overtime: number
          days: number
        }
      >()
      for (const row of metrics ?? []) {
        const u = byUser.get(row.user_id) ?? {
          active: 0,
          productive: 0,
          non_productive: 0,
          focus: [],
          overtime: 0,
          days: 0,
        }
        u.active += row.active_seconds ?? 0
        u.productive += row.productive_seconds ?? 0
        u.non_productive += row.non_productive_seconds ?? 0
        u.overtime += row.overtime_seconds ?? 0
        u.days += 1
        if (row.focus_score != null) u.focus.push(Number(row.focus_score))
        byUser.set(row.user_id, u)
      }

      const userIds = Array.from(byUser.keys())
      const { data: users } = await ctx.db
        .from('users')
        .select('id, full_name, email, department')
        .in('id', userIds)
        .eq('tenant_id', tenantId)

      const userMap = new Map((users ?? []).map((u) => [u.id, u]))

      const ranked = Array.from(byUser.entries()).map(([userId, v]) => {
        const ratio = v.active > 0 ? v.productive / v.active : 0
        const focusAvg =
          v.focus.length > 0 ? v.focus.reduce((a, b) => a + b, 0) / v.focus.length : 0
        const u = userMap.get(userId)
        return {
          user_id: userId,
          full_name: u?.full_name ?? null,
          email: u?.email ?? '',
          department: u?.department ?? null,
          active_seconds: v.active,
          productive_seconds: v.productive,
          productivity_ratio: ratio,
          focus_score: focusAvg,
          overtime_seconds: v.overtime,
          days_active: v.days,
        }
      })

      ranked.sort((a, b) => {
        if (input.metric === 'active_seconds') return b.active_seconds - a.active_seconds
        if (input.metric === 'focus_score') return b.focus_score - a.focus_score
        return b.productivity_ratio - a.productivity_ratio
      })

      return ranked.slice(0, input.limit)
    }),

  getTopDomains: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(7) }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

      const { data, error } = await ctx.db
        .from('daily_user_metrics')
        .select('domains_top')
        .eq('tenant_id', tenantId)
        .gte('metric_date', from)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const domainTotals = new Map<string, number>()
      for (const row of data ?? []) {
        const domains = row.domains_top as Array<{ domain: string; secs: number }> | null
        for (const d of domains ?? []) {
          domainTotals.set(d.domain, (domainTotals.get(d.domain) ?? 0) + d.secs)
        }
      }

      return Array.from(domainTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([domain, secs]) => ({ domain, secs }))
    }),

  // ─── Audit log ────────────────────────────────────────────────────────────

  getAuditLogs: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
        userId: z.string().uuid().optional(),
        action: z.string().optional(),
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const from = (input.page - 1) * input.pageSize
      const to = from + input.pageSize - 1

      let query = ctx.db
        .from('audit_logs')
        .select(
          'id, action, actor_id, actor_email, target_id, target_type, ip_address, metadata, created_at, users!audit_logs_actor_id_fkey(full_name)',
          { count: 'exact' },
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (input.userId) query = query.eq('actor_id', input.userId)
      if (input.action) query = query.eq('action', input.action)
      if (input.from) query = query.gte('created_at', input.from)
      if (input.to) query = query.lte('created_at', `${input.to}T23:59:59Z`)

      const { data, count, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return {
        logs: (data ?? []).map((l) => ({
          id: l.id,
          action: l.action,
          actor_id: l.actor_id,
          actor_email: l.actor_email,
          actor_name:
            (l.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
          target_id: l.target_id,
          target_type: l.target_type,
          ip_address: l.ip_address,
          metadata: l.metadata,
          created_at: l.created_at,
        })),
        total: count ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      }
    }),

  triggerAggregation: adminProcedure
    .input(
      z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const date = input.date ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      const { data, error } = await ctx.db.rpc('aggregate_daily_user_metrics', {
        p_date: date,
        p_tenant_id: tenantId,
      })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      const result = data as Array<{ rows_upserted: number }>
      return { ok: true, date, rows: result[0]?.rows_upserted ?? 0 }
    }),
})
