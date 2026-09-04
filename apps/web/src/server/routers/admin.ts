import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure, tenantAdminProcedure } from '../trpc'
import { assertUserInTenant } from '../tenant-guard'
import { localDayRange, localHourAndDow } from '@/lib/tz'
import { hashPassword, generateRandomPassword, validatePasswordPolicy } from '@/lib/auth/password'
import { logAudit } from '@/lib/auth/audit'
import { encodeBcw, decodeBcw, BCW_VERSION } from '@/lib/bcw'
import { broadcastNotificationToMany } from '@/lib/realtime-broadcast'
import {
  sendAbsenceApprovedEmail,
  sendAbsenceRejectedEmail,
  sendPayslipIssuedEmail,
} from '@/lib/email'
import type { Database } from '@bcwork/db'

type UserInsert = Database['public']['Tables']['users']['Insert']

// Zona horaria del tenant; sin ella los cortes de día y las horas nocturnas
// se calcularían en UTC y quedarían corridos cinco horas en Colombia.
async function getTenantTimezone(
  db: { from: (t: 'tenants') => any },
  tenantId: string,
): Promise<string> {
  const { data } = await db.from('tenants').select('timezone').eq('id', tenantId).maybeSingle()
  return (data?.timezone as string) || 'America/Bogota'
}

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
          .is('ended_at', null)
          .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
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

      // A propósito con adminDb: el email tiene que ser único en TODA la
      // plataforma, porque el login busca por email antes de saber el tenant.
      // Bajo RLS esta consulta solo vería la propia empresa y dejaría pasar
      // duplicados entre empresas, que romperían el login.
      const { data: existing } = await ctx.adminDb
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

      const insertData: UserInsert = {
        tenant_id: tenantId,
        email: input.email.toLowerCase(),
        full_name: input.full_name,
        role: input.role,
        password_hash: passwordHash,
        must_change_password: true,
        status: 'active',
        ...(input.department ? { department: input.department } : {}),
        ...(input.position ? { position: input.position } : {}),
      }

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

  adminResetUserPassword: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        newPassword: z.string().min(1),
        mustChangePassword: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid

      const violation = validatePasswordPolicy(input.newPassword)
      if (violation) throw new TRPCError({ code: 'BAD_REQUEST', message: violation })

      const { data: target } = await ctx.db
        .from('users')
        .select('id')
        .eq('id', input.userId)
        .eq('tenant_id', tenantId)
        .neq('role', 'platform_admin')
        .maybeSingle()

      if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' })

      const newHash = await hashPassword(input.newPassword)

      await ctx.db
        .from('users')
        .update({
          password_hash: newHash,
          password_changed_at: new Date().toISOString(),
          must_change_password: input.mustChangePassword,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.userId)
        .eq('tenant_id', tenantId)

      await ctx.db
        .from('password_history')
        .insert({ user_id: input.userId, tenant_id: tenantId, password_hash: newHash })

      await logAudit(ctx.db, {
        tenantId,
        actorUserId: ctx.user!.sub,
        action: 'user.password_changed',
        entityType: 'user',
        entityId: input.userId,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
        after: { mustChangePassword: input.mustChangePassword },
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
      const insertData = {
        tenant_id: tenantId,
        name: input.name,
        ...(input.description ? { description: input.description } : {}),
      }

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
      const { id, name, description } = input
      const updates: { name?: string; description?: string } = {}
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      const { error } = await ctx.db
        .from('teams')
        .update(updates)
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
        'id, name, timezone, weekly_hours, days_of_week, start_time, end_time, disconnection_grace_minutes, break_alert_enabled, break_alert_interval_minutes, break_alert_message, end_of_day_alert_enabled, end_of_day_alert_offset_minutes, end_of_day_alert_message, created_at',
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
        break_alert_enabled: z.boolean().default(true),
        break_alert_interval_minutes: z.number().int().min(30).max(480).default(90),
        break_alert_message: z
          .string()
          .min(5)
          .max(500)
          .default(
            'Llevas mucho tiempo conectado delante de tu PC, por favor toma un descanso de unos minutos.',
          ),
        end_of_day_alert_enabled: z.boolean().default(true),
        end_of_day_alert_offset_minutes: z.number().int().min(-60).max(0).default(0),
        end_of_day_alert_message: z
          .string()
          .min(5)
          .max(500)
          .default(
            'Has llegado al fin de tu jornada laboral. Recuerda que hasta tu siguiente día laboral no estás en la obligación de atender asuntos profesionales.',
          ),
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
        break_alert_enabled: z.boolean().optional(),
        break_alert_interval_minutes: z.number().int().min(30).max(480).optional(),
        break_alert_message: z.string().min(5).max(500).optional(),
        end_of_day_alert_enabled: z.boolean().optional(),
        end_of_day_alert_offset_minutes: z.number().int().min(-60).max(0).optional(),
        end_of_day_alert_message: z.string().min(5).max(500).optional(),
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

  getScheduleAssignments: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid
    const today = new Date().toISOString().split('T')[0]!
    const { data, error } = await ctx.db
      .from('user_schedules')
      .select('user_id, schedule_id, work_schedules(id, name)')
      .eq('tenant_id', tenantId)
      .lte('effective_from', today)
      .or('effective_to.is.null,effective_to.gte.' + today)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    return (data ?? []).map((row) => {
      const ws = Array.isArray(row.work_schedules)
        ? (row.work_schedules[0] ?? null)
        : (row.work_schedules ?? null)
      return {
        userId: row.user_id,
        scheduleId: row.schedule_id,
        scheduleName: (ws as { name: string } | null)?.name ?? null,
      }
    })
  }),

  assignScheduleToTeam: adminProcedure
    .input(z.object({ teamId: z.string().uuid(), scheduleId: z.string().uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const today = new Date().toISOString().split('T')[0]!

      const { data: members, error } = await ctx.db
        .from('team_members')
        .select('user_id')
        .eq('team_id', input.teamId)
        .eq('tenant_id', tenantId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      if (!members || members.length === 0) return { ok: true, count: 0 }

      const userIds = members.map((m) => m.user_id)

      await ctx.db
        .from('user_schedules')
        .update({ effective_to: today })
        .in('user_id', userIds)
        .eq('tenant_id', tenantId)
        .is('effective_to', null)

      if (input.scheduleId) {
        await ctx.db.from('user_schedules').insert(
          userIds.map((userId) => ({
            user_id: userId,
            tenant_id: tenantId,
            schedule_id: input.scheduleId!,
            effective_from: today,
          })),
        )
      }
      return { ok: true, count: userIds.length }
    }),

  // ─── Catálogo de apps ─────────────────────────────────────────────────────

  listAppRules: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid
    const { data, error } = await ctx.db
      .from('app_catalog')
      .select(
        'id, identifier, identifier_type, display_name, category, productivity, tenant_id, created_at',
      )
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('category', { ascending: true })
      .order('display_name', { ascending: true })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // Apps vistas en la actividad real que aún NO están en el catálogo, con su uso.
  // Agrega en el servidor sobre los eventos recientes (sin función SQL).
  listUnclassifiedApps: adminProcedure.query(async ({ ctx }) => {
    const tid = ctx.user!.tid

    const { data: cat } = await ctx.db
      .from('app_catalog')
      .select('identifier')
      .eq('tenant_id', tid)
      .eq('identifier_type', 'process')
    const known = new Set((cat ?? []).map((c) => (c.identifier ?? '').toLowerCase()))

    const PAGES = 6
    const SIZE = 1000
    const totals = new Map<string, { seconds: number; count: number }>()
    for (let p = 0; p < PAGES; p++) {
      const { data, error } = await ctx.db
        .from('activity_events')
        .select('app_identifier, duration_seconds')
        .eq('tenant_id', tid)
        .not('app_identifier', 'is', null)
        .order('started_at', { ascending: false })
        .range(p * SIZE, p * SIZE + SIZE - 1)
      if (error || !data || data.length === 0) break
      for (const e of data) {
        const id = (e.app_identifier ?? '').trim()
        if (!id || known.has(id.toLowerCase())) continue
        const cur = totals.get(id) ?? { seconds: 0, count: 0 }
        cur.seconds += e.duration_seconds ?? 0
        cur.count += 1
        totals.set(id, cur)
      }
      if (data.length < SIZE) break
    }

    return [...totals.entries()]
      .map(([app_identifier, v]) => ({
        app_identifier,
        total_seconds: v.seconds,
        event_count: v.count,
      }))
      .sort((a, b) => b.total_seconds - a.total_seconds)
      .slice(0, 50)
  }),

  upsertAppRule: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        display_name: z.string().min(1).max(100),
        identifier: z.string().min(1).max(200),
        identifier_type: z.enum(['process', 'domain']),
        category: z.enum([
          'communication',
          'development',
          'browsing',
          'entertainment',
          'productivity',
          'other',
        ]),
        productivity: z.enum(['productive', 'neutral', 'non_productive']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { id, ...rest } = input

      if (id) {
        const { error } = await ctx.db
          .from('app_catalog')
          .update(rest)
          .eq('id', id)
          .eq('tenant_id', tenantId)
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      } else {
        const { error } = await ctx.db.from('app_catalog').insert({ ...rest, tenant_id: tenantId })
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
        'legal_name, trade_name, nit, contact_email, contact_phone, timezone, data_retention_months, data_protection_officer, onboarding_complete, logo_url, notification_preferences',
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
        logo_url: z.string().url().optional(),
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

  uploadLogo: adminProcedure
    .input(
      z.object({
        base64: z.string(),
        mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { createClient } = await import('@supabase/supabase-js')
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      )

      const ext = input.mimeType.split('/')[1]!.replace('jpeg', 'jpg')
      const path = `${ctx.user!.tid}/logo.${ext}`

      const buffer = Buffer.from(input.base64, 'base64')
      const { error } = await adminClient.storage.from('tenant-logos').upload(path, buffer, {
        contentType: input.mimeType,
        upsert: true,
      })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const { data: urlData } = adminClient.storage.from('tenant-logos').getPublicUrl(path)

      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

      await ctx.db
        .from('tenants')
        .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', ctx.user!.tid)

      return { url: publicUrl }
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
      .from('app_catalog')
      .select('identifier, productivity, identifier_type')
      .eq('tenant_id', ctx.user!.tid)
      .eq('identifier_type', 'domain')
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

      // Código de 8 chars alfanumérico mayúsculas (6 bytes base64url = exactamente 8 chars)
      const { randomBytes, createHash } = await import('crypto')
      const code = randomBytes(6).toString('base64url').toUpperCase().slice(0, 8)
      const codeHash = createHash('sha256').update(code).digest('hex')

      const { data, error } = await ctx.db
        .from('enrollment_codes')
        .insert({
          tenant_id: tenantId,
          user_id: input.userId,
          created_by: ctx.user!.sub,
          code,
          code_hash: codeHash,
          expires_at: expiresAt.toISOString(),
        })
        .select('id, code, expires_at')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { code: data.code as string, expiresAt: data.expires_at as string }
    }),

  // ─── Tokens de aprovisionamiento (instalador por-tenant) ────────────────────

  // Crea un token de tenant reutilizable. El claro se devuelve UNA sola vez.
  // Es el token que se embebe en el instalador por-tenant.
  createProvisioningToken: tenantAdminProcedure
    .input(z.object({ label: z.string().max(80).optional() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { randomBytes, createHash } = await import('crypto')
      // 32 bytes → 64 chars hex (ancho fijo, compatible con el placeholder del MSI)
      const token = randomBytes(32).toString('hex')
      const tokenHash = createHash('sha256').update(token).digest('hex')

      const { data, error } = await ctx.db
        .from('agent_provisioning_tokens')
        .insert({
          tenant_id: tenantId,
          token_hash: tokenHash,
          token_prefix: token.slice(0, 8),
          label: input.label ?? null,
          created_by: ctx.user!.sub,
        })
        .select('id, token_prefix, created_at')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await logAudit(ctx.db, {
        tenantId,
        actorUserId: ctx.user!.sub,
        action: 'provisioning_token.created',
        entityType: 'provisioning_token',
        entityId: data.id,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
      })

      return { id: data.id, token, prefix: data.token_prefix as string }
    }),

  listProvisioningTokens: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid
    const { data, error } = await ctx.db
      .from('agent_provisioning_tokens')
      .select('id, token_prefix, label, created_at, last_used_at, provisioned_count, revoked_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  revokeProvisioningToken: tenantAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db
        .from('agent_provisioning_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
        .is('revoked_at', null)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await logAudit(ctx.db, {
        tenantId,
        actorUserId: ctx.user!.sub,
        action: 'provisioning_token.revoked',
        entityType: 'provisioning_token',
        entityId: input.id,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return { ok: true }
    }),

  // ─── Actualizaciones del agente ──────────────────────────────────────────────
  getLatestAgentVersion: adminProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.db
      .from('agent_release')
      .select('version, notes, published_at')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ?? null
  }),

  // ─── Inventario de aplicaciones instaladas ──────────────────────────────────
  listInstalledApps: adminProcedure
    .input(
      z.object({
        deviceId: z.string().uuid().optional(),
        search: z.string().max(200).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const offset = (input.page - 1) * input.pageSize

      let query = ctx.db
        .from('installed_apps')
        .select(
          'id, name, version, publisher, install_date, last_seen, source, device_id, device:agent_devices(hostname, name)',
          { count: 'exact' },
        )
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .range(offset, offset + input.pageSize - 1)

      if (input.deviceId) query = query.eq('device_id', input.deviceId)
      if (input.search) query = query.ilike('name', `%${input.search}%`)

      const { data, error, count } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { data: data ?? [], total: count ?? 0, page: input.page, pageSize: input.pageSize }
    }),

  // Resumen del inventario: total de apps y equipos con inventario.
  getInventorySummary: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid
    const [{ count: totalApps }, { data: devices }] = await Promise.all([
      ctx.db
        .from('installed_apps')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      ctx.db.from('installed_apps').select('device_id').eq('tenant_id', tenantId),
    ])
    const deviceSet = new Set((devices ?? []).map((d) => d.device_id))
    return { totalApps: totalApps ?? 0, devicesWithInventory: deviceSet.size }
  }),

  /**
   * Cumplimiento de jornada por colaborador, con comparación contra el período
   * anterior y las excepciones del período.
   *
   * `expected_seconds` y `overtime_seconds` ya se calculaban a diario y no se
   * mostraban en ninguna pantalla: el panel decía "estuvo 71 minutos" cuando lo
   * reportable es "cumplió el 13% de su jornada".
   */
  getComplianceReport: adminProcedure
    .input(
      z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid

      // Período anterior de la misma longitud, para el "vs."
      const dLen = Math.max(
        1,
        Math.round(
          (Date.parse(`${input.to}T00:00:00Z`) - Date.parse(`${input.from}T00:00:00Z`)) / 86400000,
        ) + 1,
      )
      const prevTo = new Date(Date.parse(`${input.from}T00:00:00Z`) - 86400000)
      const prevFrom = new Date(prevTo.getTime() - (dLen - 1) * 86400000)
      const iso = (d: Date) => d.toISOString().slice(0, 10)

      const [{ data: rows }, { data: prevRows }, { data: users }, { data: company }] =
        await Promise.all([
          ctx.db
            .from('daily_user_metrics')
            .select(
              'user_id, metric_date, expected_seconds, active_seconds, productive_seconds, overtime_seconds',
            )
            .eq('tenant_id', tenantId)
            .gte('metric_date', input.from)
            .lte('metric_date', input.to),
          ctx.db
            .from('daily_user_metrics')
            .select('user_id, expected_seconds, active_seconds')
            .eq('tenant_id', tenantId)
            .gte('metric_date', iso(prevFrom))
            .lte('metric_date', iso(prevTo)),
          ctx.db
            .from('users')
            .select('id, full_name, department, position')
            .eq('tenant_id', tenantId)
            .eq('status', 'active'),
          ctx.db
            .from('tenants')
            .select('trade_name, legal_name, nit, logo_url')
            .eq('id', tenantId)
            .maybeSingle(),
        ])

      type Acc = {
        expected: number
        active: number
        productive: number
        overtime: number
        dias: number
        incompletos: number
        conExtra: number
      }
      const acc = new Map<string, Acc>()
      for (const r of rows ?? []) {
        if (!r.user_id) continue
        const a = acc.get(r.user_id) ?? {
          expected: 0,
          active: 0,
          productive: 0,
          overtime: 0,
          dias: 0,
          incompletos: 0,
          conExtra: 0,
        }
        const esperado = r.expected_seconds ?? 0
        const real = r.active_seconds ?? 0
        a.expected += esperado
        a.active += real
        a.productive += r.productive_seconds ?? 0
        a.overtime += r.overtime_seconds ?? 0
        a.dias += 1
        // Jornada incompleta: menos del 80% de lo pactado ese día.
        if (esperado > 0 && real < esperado * 0.8) a.incompletos += 1
        if ((r.overtime_seconds ?? 0) > 0) a.conExtra += 1
        acc.set(r.user_id, a)
      }

      const prevAcc = new Map<string, { expected: number; active: number }>()
      for (const r of prevRows ?? []) {
        if (!r.user_id) continue
        const p = prevAcc.get(r.user_id) ?? { expected: 0, active: 0 }
        p.expected += r.expected_seconds ?? 0
        p.active += r.active_seconds ?? 0
        prevAcc.set(r.user_id, p)
      }

      const byId = new Map((users ?? []).map((u) => [u.id, u]))
      const people = [...acc.entries()].map(([userId, a]) => {
        const u = byId.get(userId)
        const ratio = a.expected > 0 ? a.active / a.expected : null
        const prev = prevAcc.get(userId)
        const prevRatio = prev && prev.expected > 0 ? prev.active / prev.expected : null
        return {
          userId,
          fullName: u?.full_name ?? 'Colaborador',
          department: u?.department ?? null,
          position: u?.position ?? null,
          expectedSeconds: a.expected,
          activeSeconds: a.active,
          productiveSeconds: a.productive,
          overtimeSeconds: a.overtime,
          daysWithData: a.dias,
          incompleteDays: a.incompletos,
          daysWithOvertime: a.conExtra,
          complianceRatio: ratio,
          previousRatio: prevRatio,
          // null cuando no hay con qué comparar: un delta inventado es peor que
          // un hueco declarado.
          delta: ratio !== null && prevRatio !== null ? ratio - prevRatio : null,
        }
      })

      people.sort((a, b) => (a.complianceRatio ?? 0) - (b.complianceRatio ?? 0))

      const totExpected = people.reduce((s, p) => s + p.expectedSeconds, 0)
      const totActive = people.reduce((s, p) => s + p.activeSeconds, 0)

      return {
        from: input.from,
        to: input.to,
        previousFrom: iso(prevFrom),
        previousTo: iso(prevTo),
        company: company ?? null,
        people,
        totals: {
          expectedSeconds: totExpected,
          activeSeconds: totActive,
          complianceRatio: totExpected > 0 ? totActive / totExpected : null,
          overtimeSeconds: people.reduce((s, p) => s + p.overtimeSeconds, 0),
          incompleteDays: people.reduce((s, p) => s + p.incompleteDays, 0),
          peopleBelow80: people.filter((p) => p.complianceRatio !== null && p.complianceRatio < 0.8)
            .length,
        },
      }
    }),

  /**
   * Riesgo de desconexión laboral (Ley 2191 de 2022).
   *
   * Invierte el encuadre del producto: no vigila al trabajador, le avisa al
   * empleador que está incumpliendo. Marca actividad fuera de la jornada — de
   * noche, de madrugada o en fin de semana — porque la obligación de garantizar
   * la desconexión es de la empresa, no de la persona.
   *
   * Las horas se evalúan en la zona del tenant: en UTC, las 19:00 de Bogotá
   * parecerían medianoche y el conteo sería falso.
   */
  getDisconnectionRisk: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(14) }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const tz = await getTenantTimezone(ctx.db, tenantId)
      const from = new Date(Date.now() - input.days * 86400000).toISOString()

      const [{ data: events }, { data: users }] = await Promise.all([
        ctx.db
          .from('activity_events')
          .select('user_id, started_at, duration_seconds')
          .eq('tenant_id', tenantId)
          .gte('started_at', from)
          .order('started_at', { ascending: false })
          .limit(20000),
        ctx.db.from('users').select('id, full_name').eq('tenant_id', tenantId),
      ])

      const nombres = new Map((users ?? []).map((u) => [u.id, u.full_name ?? 'Colaborador']))

      type Acc = {
        userId: string
        nocturno: number
        madrugada: number
        finDeSemana: number
        dias: Set<string>
        ultima: string | null
      }
      const porUsuario = new Map<string, Acc>()

      for (const e of events ?? []) {
        if (!e.user_id || !e.started_at) continue
        const { hour, dow } = localHourAndDow(e.started_at, tz)
        const esNocturno = hour >= 20 && hour <= 23
        const esMadrugada = hour >= 0 && hour < 6
        const esFinde = dow === 0 || dow === 6
        if (!esNocturno && !esMadrugada && !esFinde) continue

        const a = porUsuario.get(e.user_id) ?? {
          userId: e.user_id,
          nocturno: 0,
          madrugada: 0,
          finDeSemana: 0,
          dias: new Set<string>(),
          ultima: null,
        }
        const secs = e.duration_seconds ?? 0
        if (esMadrugada) a.madrugada += secs
        else if (esNocturno) a.nocturno += secs
        if (esFinde) a.finDeSemana += secs
        a.dias.add(e.started_at.slice(0, 10))
        if (!a.ultima || e.started_at > a.ultima) a.ultima = e.started_at
        porUsuario.set(e.user_id, a)
      }

      return [...porUsuario.values()]
        .map((a) => ({
          userId: a.userId,
          fullName: nombres.get(a.userId) ?? 'Colaborador',
          nightSeconds: a.nocturno,
          earlyMorningSeconds: a.madrugada,
          weekendSeconds: a.finDeSemana,
          daysAffected: a.dias.size,
          lastAt: a.ultima,
          totalSeconds: a.nocturno + a.madrugada + a.finDeSemana,
        }))
        .filter((r) => r.totalSeconds >= 300) // menos de 5 min es ruido, no una jornada
        .sort((a, b) => b.totalSeconds - a.totalSeconds)
    }),

  // Detalle del día de un colaborador: la franja de actividad y el reparto
  // entre tiempo activo e inactivo. Hasta ahora esta vista solo existía para el
  // empleado sobre sí mismo; el administrador únicamente veía promedios.
  getUserDayDetail: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertUserInTenant(ctx.db, input.userId, ctx.user!.tid)
      const tz = await getTenantTimezone(ctx.db, ctx.user!.tid)
      const { from, to } = localDayRange(input.date, tz)

      const [eventsRes, metricsRes, sessionsRes] = await Promise.all([
        ctx.db
          .from('activity_events')
          .select('id, started_at, duration_seconds, app_identifier, productivity')
          .eq('tenant_id', ctx.user!.tid)
          .eq('user_id', input.userId)
          .gte('started_at', from)
          .lt('started_at', to)
          .order('started_at', { ascending: true })
          .limit(1000),
        ctx.db
          .from('daily_user_metrics')
          .select('active_seconds, productive_seconds, non_productive_seconds, productivity_ratio')
          .eq('tenant_id', ctx.user!.tid)
          .eq('user_id', input.userId)
          .eq('metric_date', input.date)
          .maybeSingle(),
        ctx.db
          .from('work_sessions')
          .select('id, started_at, ended_at, active_seconds, idle_seconds')
          .eq('tenant_id', ctx.user!.tid)
          .eq('user_id', input.userId)
          .gte('started_at', from)
          .lt('started_at', to)
          .order('started_at', { ascending: true }),
      ])

      const sessions = sessionsRes.data ?? []
      const activeSeconds = sessions.reduce((s, x) => s + (x.active_seconds ?? 0), 0)
      const idleSeconds = sessions.reduce((s, x) => s + (x.idle_seconds ?? 0), 0)

      return {
        timezone: tz,
        events: (eventsRes.data ?? []).map((e) => ({
          id: String(e.id),
          started_at: e.started_at,
          duration_seconds: e.duration_seconds ?? 0,
          app_identifier: e.app_identifier ?? null,
          productivity: (e.productivity ?? 'neutral') as string,
        })),
        sessions: sessions.map((s) => ({
          id: String(s.id),
          started_at: s.started_at,
          ended_at: s.ended_at,
          active_seconds: s.active_seconds ?? 0,
          idle_seconds: s.idle_seconds ?? 0,
        })),
        totals: {
          active_seconds: activeSeconds,
          idle_seconds: idleSeconds,
          // Presencia = tiempo con el equipo encendido. Distinguirla del tiempo
          // activo es lo que hace creíble cualquier porcentaje.
          presence_seconds: activeSeconds + idleSeconds,
          productive_seconds: metricsRes.data?.productive_seconds ?? 0,
          non_productive_seconds: metricsRes.data?.non_productive_seconds ?? 0,
          productivity_ratio: Number(metricsRes.data?.productivity_ratio ?? 0),
        },
      }
    }),

  /**
   * Agentes que dejaron de reportar.
   *
   * El de CK Solutions estuvo nueve días caído sin que nada lo delatara: la
   * empresa creía estar monitoreada y no lo estaba. Un agente mudo no genera
   * error, genera silencio — y el silencio se lee igual que "nadie trabajó".
   */
  getStaleAgents: adminProcedure
    .input(z.object({ hours: z.number().int().min(1).max(720).default(24) }))
    .query(async ({ ctx, input }) => {
      const corte = new Date(Date.now() - input.hours * 3600_000).toISOString()

      const { data: devices } = await ctx.db
        .from('agent_devices')
        .select('id, hostname, user_id, last_seen_at, enrolled_at, service_version')
        .eq('tenant_id', ctx.user!.tid)
        .is('revoked_at', null)

      const mudos = (devices ?? []).filter((d) => !d.last_seen_at || d.last_seen_at < corte)
      if (mudos.length === 0) return []

      const ids = [...new Set(mudos.map((d) => d.user_id).filter(Boolean))] as string[]
      const { data: users } = ids.length
        ? await ctx.db
            .from('users')
            .select('id, full_name')
            .eq('tenant_id', ctx.user!.tid)
            .in('id', ids)
        : { data: [] }
      const byId = new Map((users ?? []).map((u) => [u.id, u.full_name]))

      return mudos
        .map((d) => ({
          deviceId: d.id,
          hostname: d.hostname,
          fullName: d.user_id ? (byId.get(d.user_id) ?? 'Colaborador') : '(sin asignar)',
          lastSeenAt: d.last_seen_at,
          serviceVersion: d.service_version,
          hoursSilent: d.last_seen_at
            ? Math.floor((Date.now() - Date.parse(d.last_seen_at)) / 3600_000)
            : null,
        }))
        .sort((a, b) => (b.hoursSilent ?? 99999) - (a.hoursSilent ?? 99999))
    }),

  // Colaboradores con agente instalado que NO tienen consentimiento vigente.
  // Ley 1581/2012: el monitoreo requiere autorizacion previa del titular. Esto
  // no bloquea la captura — la hace visible para que el administrador regularice.
  getMonitoringWithoutConsent: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid

    const [{ data: devices }, { data: consents }] = await Promise.all([
      ctx.db
        .from('agent_devices')
        .select('user_id, hostname, enrolled_at')
        .eq('tenant_id', tenantId)
        .is('revoked_at', null)
        .not('user_id', 'is', null),
      ctx.db
        .from('consents')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('consent_type', 'monitoring_basic')
        .eq('granted', true)
        .is('revoked_at', null),
    ])

    const consintieron = new Set((consents ?? []).map((c) => c.user_id))
    const pendientes = (devices ?? []).filter((d) => d.user_id && !consintieron.has(d.user_id))
    if (pendientes.length === 0) return []

    const { data: users } = await ctx.db
      .from('users')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId)
      .in('id', [...new Set(pendientes.map((d) => d.user_id as string))])

    const byId = new Map((users ?? []).map((u) => [u.id, u]))
    return pendientes.map((d) => ({
      userId: d.user_id as string,
      fullName: byId.get(d.user_id as string)?.full_name ?? '(desconocido)',
      email: String(byId.get(d.user_id as string)?.email ?? ''),
      hostname: d.hostname,
      enrolledAt: d.enrolled_at,
    }))
  }),

  listDevices: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(500).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const offset = (input.page - 1) * input.pageSize

      let query = ctx.db
        .from('agent_devices')
        .select(
          'id, user_id, name, platform, hostname, enrolled_at, last_seen_at, revoked_at, service_version, tamper_status',
          {
            count: 'exact',
          },
        )
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

      // Revocar api_keys asociadas al dispositivo (filtro por nombre, sin user_id que no existe en api_keys)
      await ctx.db
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
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

  deleteDevice: adminProcedure
    .input(z.object({ deviceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid

      const { data: device, error: fetchErr } = await ctx.db
        .from('agent_devices')
        .select('id')
        .eq('id', input.deviceId)
        .eq('tenant_id', tenantId)
        .not('revoked_at', 'is', null)
        .single()

      if (fetchErr || !device)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Dispositivo no encontrado o no está revocado',
        })

      await ctx.db
        .from('api_keys')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('name', `agent:${input.deviceId}`)

      const { error } = await ctx.db
        .from('agent_devices')
        .delete()
        .eq('id', input.deviceId)
        .eq('tenant_id', tenantId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      await logAudit(ctx.db, {
        tenantId,
        actorUserId: ctx.user!.sub,
        action: 'device.deleted',
        entityType: 'agent_device',
        entityId: input.deviceId,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
      })
      return { ok: true }
    }),

  setDevicePin: adminProcedure
    .input(
      z.object({
        deviceId: z.string().uuid(),
        pin: z.string().min(4).max(12).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db
        .from('agent_devices')
        .update({ pin_hash: input.pin })
        .eq('id', input.deviceId)
        .eq('tenant_id', tenantId)
        .select('id')

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
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

  // Snapshot en vivo: cuántos dispositivos están activos/en pausa/offline ahora
  getTeamSnapshot: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid
    const now = new Date()
    const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString()
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
    const today = now.toISOString().slice(0, 10)

    const { data: devices } = await ctx.db
      .from('agent_devices')
      .select('id, last_seen_at')
      .eq('tenant_id', tenantId)
      .is('revoked_at', null)

    const devs = devices ?? []
    const active = devs.filter((d) => d.last_seen_at && d.last_seen_at >= twoMinAgo).length
    const passive = devs.filter(
      (d) => d.last_seen_at && d.last_seen_at >= tenMinAgo && d.last_seen_at < twoMinAgo,
    ).length
    const offline = devs.length - active - passive

    const { data: todayMetrics } = await ctx.db
      .from('daily_user_metrics')
      .select('productivity_ratio, productive_seconds, active_seconds')
      .eq('tenant_id', tenantId)
      .eq('metric_date', today)

    const metrics = todayMetrics ?? []
    const avgProductivity =
      metrics.length > 0
        ? metrics.reduce((s, r) => s + Number(r.productivity_ratio ?? 0), 0) / metrics.length
        : 0
    const totalProductiveSecs = metrics.reduce((s, r) => s + (r.productive_seconds ?? 0), 0)
    const totalActiveSecs = metrics.reduce((s, r) => s + (r.active_seconds ?? 0), 0)

    return {
      active,
      passive,
      offline,
      total: devs.length,
      avgProductivity: Math.round(avgProductivity * 100),
      totalProductiveSecs,
      totalActiveSecs,
      usersWithData: metrics.length,
    }
  }),

  // KPIs agregados del período (sesiones, horas, focus)
  getTodayKpis: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(30).default(7) }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

      const { data: metrics } = await ctx.db
        .from('daily_user_metrics')
        .select('metric_date, user_id, active_seconds, productive_seconds, focus_score')
        .eq('tenant_id', tenantId)
        .gte('metric_date', from)

      const rows = metrics ?? []
      if (rows.length === 0) {
        return {
          productiveHrsPerDay: 0,
          focusScore: 0,
          productiveMinPerSession: 0,
          activeHrsPerDay: 0,
        }
      }

      const totalProductive = rows.reduce((s, r) => s + (r.productive_seconds ?? 0), 0)
      const totalActive = rows.reduce((s, r) => s + (r.active_seconds ?? 0), 0)
      const focusScores = rows
        .filter((r) => r.focus_score != null)
        .map((r) => Number(r.focus_score))
      const avgFocus =
        focusScores.length > 0 ? focusScores.reduce((a, b) => a + b) / focusScores.length : 0

      const { data: sessions } = await ctx.db
        .from('work_sessions')
        .select('active_seconds')
        .eq('tenant_id', tenantId)
        .gte('started_at', from + 'T00:00:00Z')

      const sessionCount = (sessions ?? []).length
      const avgProductiveSecsPerSession = sessionCount > 0 ? totalProductive / sessionCount : 0

      return {
        productiveHrsPerDay: Math.round((totalProductive / rows.length / 3600) * 10) / 10,
        activeHrsPerDay: Math.round((totalActive / rows.length / 3600) * 10) / 10,
        focusScore: Math.round(avgFocus),
        productiveMinPerSession: Math.round(avgProductiveSecsPerSession / 60),
      }
    }),

  // Categorías de apps más usadas en el período
  getTopCategories: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(30).default(7) }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

      const { data } = await ctx.db
        .from('daily_user_metrics')
        .select('apps_top')
        .eq('tenant_id', tenantId)
        .gte('metric_date', from)

      const appTotals = new Map<string, number>()
      for (const row of data ?? []) {
        const apps = row.apps_top as Array<{ identifier: string; secs: number }> | null
        for (const app of apps ?? []) {
          appTotals.set(app.identifier, (appTotals.get(app.identifier) ?? 0) + app.secs)
        }
      }

      if (appTotals.size === 0) return []

      const identifiers = Array.from(appTotals.keys())
      const { data: catalog } = await ctx.db
        .from('app_catalog')
        .select('identifier, category, productivity')
        .eq('tenant_id', tenantId)
        .in('identifier', identifiers)

      const catalogMap = new Map((catalog ?? []).map((c) => [c.identifier, c]))
      const catTotals = new Map<string, number>()
      for (const [identifier, secs] of appTotals.entries()) {
        const cat = catalogMap.get(identifier)
        const category = cat?.category ?? 'other'
        catTotals.set(category, (catTotals.get(category) ?? 0) + secs)
      }

      const total = Array.from(catTotals.values()).reduce((a, b) => a + b, 0)
      return Array.from(catTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category, secs]) => ({
          category,
          secs,
          pct: total > 0 ? Math.round((secs / total) * 100) : 0,
        }))
    }),

  // Tendencia de carga (apilado por día: productivo / neutral / no productivo)
  getWorkloadTrend: adminProcedure
    .input(z.object({ days: z.number().int().min(7).max(30).default(7) }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

      const { data } = await ctx.db
        .from('daily_user_metrics')
        .select('metric_date, active_seconds, productive_seconds, non_productive_seconds')
        .eq('tenant_id', tenantId)
        .gte('metric_date', from)
        .order('metric_date', { ascending: true })

      const byDate = new Map<
        string,
        { productive: number; neutral: number; non_productive: number }
      >()
      for (const row of data ?? []) {
        const d = byDate.get(row.metric_date) ?? { productive: 0, neutral: 0, non_productive: 0 }
        const p = row.productive_seconds ?? 0
        const np = row.non_productive_seconds ?? 0
        const a = row.active_seconds ?? 0
        d.productive += p
        d.non_productive += np
        d.neutral += Math.max(0, a - p - np)
        byDate.set(row.metric_date, d)
      }

      return Array.from(byDate.entries()).map(([date, v]) => ({
        date,
        productive_hours: Math.round((v.productive / 3600) * 10) / 10,
        neutral_hours: Math.round((v.neutral / 3600) * 10) / 10,
        non_productive_hours: Math.round((v.non_productive / 3600) * 10) / 10,
      }))
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
      const rangeFrom = (input.page - 1) * input.pageSize
      const rangeTo = rangeFrom + input.pageSize - 1

      let query = ctx.db
        .from('audit_logs')
        .select(
          'id, action, actor_user_id, entity_id, entity_type, ip_inet, after_state, occurred_at',
          { count: 'exact' },
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('occurred_at', { ascending: false })
        .range(rangeFrom, rangeTo)

      if (input.userId) query = query.eq('actor_user_id', input.userId)
      if (input.action) query = query.ilike('action', `%${input.action}%`)
      if (input.from) query = query.gte('occurred_at', input.from)
      if (input.to) query = query.lte('occurred_at', `${input.to}T23:59:59Z`)

      const { data, count, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Enriquecer con datos del actor en una segunda query
      const actorIds = [
        ...new Set(
          (data ?? []).map((l) => l.actor_user_id).filter((id): id is string => id !== null),
        ),
      ]
      const { data: actors } = actorIds.length
        ? await ctx.db.from('users').select('id, full_name, email').in('id', actorIds)
        : { data: [] }
      const actorMap = new Map((actors ?? []).map((u) => [u.id, u]))

      return {
        logs: (data ?? []).map((l) => {
          const actor = l.actor_user_id ? actorMap.get(l.actor_user_id) : null
          return {
            id: l.id,
            action: l.action,
            actor_id: l.actor_user_id,
            actor_email: actor?.email ?? null,
            actor_name: actor?.full_name ?? null,
            target_id: l.entity_id,
            target_type: l.entity_type,
            ip_address: l.ip_inet,
            metadata: l.after_state,
            created_at: l.occurred_at,
          }
        }),
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
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const date = input.date ?? today

      // Siempre agrega hoy; si no se especificó fecha también agrega ayer
      const dates = date === today ? [yesterday, today] : [date]
      let totalRows = 0
      for (const d of dates) {
        const { data, error } = await ctx.db.rpc('aggregate_daily_user_metrics', {
          p_date: d,
          p_tenant_id: tenantId,
        })
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        const result = data as Array<{ rows_upserted: number }>
        totalRows += result[0]?.rows_upserted ?? 0
      }

      return { ok: true, date, rows: totalRows }
    }),

  // ─── Proyectos ────────────────────────────────────────────────────────────

  listProjects: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('projects')
      .select('id, name, description, color, is_active, created_at, created_by')
      .eq('tenant_id', ctx.user!.tid)
      .order('name')

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createProject: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default('#3b82f6'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('projects')
        .insert({
          tenant_id: ctx.user!.tid,
          name: input.name,
          description: input.description ?? null,
          color: input.color,
          created_by: ctx.user!.sub,
        })
        .select('id')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true, id: data.id }
    }),

  updateProject: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        is_active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input
      const { error } = await ctx.db
        .from('projects')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteProject: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('projects')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  listProjectTasks: adminProcedure
    .input(z.object({ project_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('project_tasks')
        .select('id, name, description, is_active, created_at')
        .eq('project_id', input.project_id)
        .eq('tenant_id', ctx.user!.tid)
        .order('name')

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  createProjectTask: adminProcedure
    .input(
      z.object({
        project_id: z.string().uuid(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('project_tasks')
        .insert({
          tenant_id: ctx.user!.tid,
          project_id: input.project_id,
          name: input.name,
          description: input.description ?? null,
        })
        .select('id')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true, id: data.id }
    }),

  updateProjectTask: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        is_active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input
      const { error } = await ctx.db
        .from('project_tasks')
        .update(fields)
        .eq('id', id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Solicitudes de horas extra (admin) ─────────────────────────────────

  getOvertimeRequests: adminProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('overtime_requests')
        .select(
          'id, date, overtime_seconds, type, reason, status, manager_note, created_at, employee_id, users!overtime_requests_employee_id_fkey(full_name, email, department)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
        .limit(100)

      if (input.status !== 'all') {
        q = q.eq('status', input.status)
      }

      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  updateOvertimeRequest: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['approved', 'rejected']),
        manager_note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('overtime_requests')
        .update({
          status: input.status,
          manager_note: input.manager_note ?? null,
          reviewed_by: ctx.user!.sub,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Notify employee
      const { data: req } = await ctx.db
        .from('overtime_requests')
        .select('employee_id')
        .eq('id', input.id)
        .single()

      if (req) {
        await ctx.db.from('notifications').insert({
          tenant_id: ctx.user!.tid,
          user_id: req.employee_id,
          channel: 'in_app' as const,
          title: input.status === 'approved' ? 'Horas extra aprobadas' : 'Horas extra rechazadas',
          body:
            input.status === 'approved'
              ? 'Tu solicitud de reconocimiento de horas extra fue aprobada.'
              : `Tu solicitud fue rechazada. ${input.manager_note ?? ''}`,
          sent_by: ctx.user!.sub,
        })
      }

      return { ok: true }
    }),

  // ─── Objetivos / KPIs (admin) ────────────────────────────────────────────

  listGoals: adminProcedure
    .input(
      z.object({
        employeeId: z.string().uuid().optional(),
        status: z.enum(['active', 'completed', 'cancelled', 'all']).default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('employee_goals')
        .select(
          'id, title, description, target_value, current_value, unit, due_date, status, created_at, employee_id, users!employee_goals_employee_id_fkey(full_name, department)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
        .limit(200)

      if (input.employeeId) q = q.eq('employee_id', input.employeeId)
      if (input.status !== 'all') q = q.eq('status', input.status)

      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  createGoal: adminProcedure
    .input(
      z.object({
        employee_id: z.string().uuid(),
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        target_value: z.number().optional(),
        unit: z.string().max(50).optional(),
        due_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('employee_goals')
        .insert({
          tenant_id: ctx.user!.tid,
          employee_id: input.employee_id,
          created_by: ctx.user!.sub,
          title: input.title,
          description: input.description ?? null,
          target_value: input.target_value ?? null,
          unit: input.unit ?? null,
          due_date: input.due_date ?? null,
          status: 'active',
        })
        .select('id')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Notify employee
      await ctx.db.from('notifications').insert({
        tenant_id: ctx.user!.tid,
        user_id: input.employee_id,
        channel: 'in_app' as const,
        title: 'Nuevo objetivo asignado',
        body: `Tu manager te asignó un nuevo objetivo: "${input.title}"`,
        sent_by: ctx.user!.sub,
      })

      return { ok: true, id: data.id }
    }),

  updateGoal: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        target_value: z.number().optional(),
        unit: z.string().max(50).optional(),
        due_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        status: z.enum(['active', 'completed', 'cancelled']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input
      const { error } = await ctx.db
        .from('employee_goals')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Mensajes admin ──────────────────────────────────────────────────────

  getAdminConversations: adminProcedure.query(async ({ ctx }) => {
    const userId = ctx.user!.sub

    const { data, error } = await ctx.db
      .from('messages')
      .select('id, from_user_id, to_user_id, body, read_at, created_at')
      .eq('tenant_id', ctx.user!.tid)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    const msgs = data ?? []
    const interlocutorIds = new Set<string>()
    for (const m of msgs) {
      const other = m.from_user_id === userId ? m.to_user_id : m.from_user_id
      interlocutorIds.add(other)
    }

    if (interlocutorIds.size === 0) return []

    const { data: users } = await ctx.db
      .from('users')
      .select('id, full_name, role, department')
      .in('id', Array.from(interlocutorIds))

    const userMap = new Map((users ?? []).map((u) => [u.id, u]))

    const convMap = new Map<
      string,
      {
        userId: string
        fullName: string
        role: string
        lastMessage: string
        lastAt: string
        unread: number
      }
    >()

    for (const m of msgs) {
      const other = m.from_user_id === userId ? m.to_user_id : m.from_user_id
      if (!convMap.has(other)) {
        const u = userMap.get(other)
        convMap.set(other, {
          userId: other,
          fullName: u?.full_name ?? 'Usuario',
          role: u?.role ?? 'employee',
          lastMessage: m.body,
          lastAt: m.created_at,
          unread: 0,
        })
      }
      if (m.to_user_id === userId && !m.read_at) {
        convMap.get(other)!.unread++
      }
    }

    return Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    )
  }),

  // ─── Ausencias ────────────────────────────────────────────────────────────

  getAbsenceRequests: adminProcedure
    .input(
      z.object({
        status: z.enum(['all', 'pending', 'approved', 'rejected', 'cancelled']).default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('absence_requests')
        .select(
          '*, users!absence_requests_employee_id_fkey(id, full_name, email, department, position)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })

      if (input.status !== 'all') q = q.eq('status', input.status)

      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  updateAbsenceRequest: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['approved', 'rejected']),
        manager_note: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: req } = await ctx.db
        .from('absence_requests')
        .select('employee_id, days_count, type, start_date, end_date')
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .single()

      const { error } = await ctx.db
        .from('absence_requests')
        .update({
          status: input.status,
          manager_note: input.manager_note ?? null,
          reviewed_by: ctx.user!.sub,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Update PTO balance if approved
      if (input.status === 'approved' && req) {
        const year = new Date().getFullYear()
        const field = req.type === 'vacation' ? 'vacation_days_used' : 'sick_days_used'
        const { data: bal } = await ctx.db
          .from('absence_balances')
          .select('*')
          .eq('employee_id', req.employee_id)
          .eq('year', year)
          .maybeSingle()

        const daysUsed = Number(req.days_count)
        if (bal) {
          const currentVal = Number(bal[field as 'vacation_days_used' | 'sick_days_used'] ?? 0)
          const patch =
            field === 'vacation_days_used'
              ? { vacation_days_used: currentVal + daysUsed, updated_at: new Date().toISOString() }
              : { sick_days_used: currentVal + daysUsed, updated_at: new Date().toISOString() }
          await ctx.db.from('absence_balances').update(patch).eq('id', bal.id)
        } else {
          const insertData =
            field === 'vacation_days_used'
              ? {
                  tenant_id: ctx.user!.tid,
                  employee_id: req.employee_id,
                  year,
                  vacation_days_used: daysUsed,
                }
              : {
                  tenant_id: ctx.user!.tid,
                  employee_id: req.employee_id,
                  year,
                  sick_days_used: daysUsed,
                }
          await ctx.db.from('absence_balances').insert(insertData)
        }
      }

      // Notify employee
      if (req) {
        broadcastNotificationToMany([req.employee_id])
        const isApproved = input.status === 'approved'
        await (ctx.db as any).from('notifications').insert({
          tenant_id: ctx.user!.tid,
          user_id: req.employee_id,
          type: isApproved ? 'absence_approved' : 'absence_rejected',
          title: isApproved ? 'Solicitud de ausencia aprobada' : 'Solicitud de ausencia rechazada',
          message: isApproved
            ? `Tu solicitud de ausencia ha sido aprobada.${input.manager_note ? ` Nota: ${input.manager_note}` : ''}`
            : `Tu solicitud de ausencia ha sido rechazada.${input.manager_note ? ` Motivo: ${input.manager_note}` : ''}`,
          link: '/absences',
          is_read: false,
        })

        // Send email to employee
        const { data: emp } = await ctx.db
          .from('users')
          .select('full_name, email')
          .eq('id', req.employee_id)
          .single()
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.bcwork.co'
        const r = req as unknown as {
          type: string
          start_date: string
          end_date: string
          days_count: number
        }
        const fmt = (d: string) =>
          new Date(d).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })

        if (emp?.email) {
          if (isApproved) {
            void sendAbsenceApprovedEmail({
              to: emp.email,
              employeeName: emp.full_name ?? 'Colaborador',
              type: r.type,
              startDate: fmt(r.start_date),
              endDate: fmt(r.end_date),
              days: Number(r.days_count),
              note: input.manager_note,
              appUrl,
            })
          } else {
            void sendAbsenceRejectedEmail({
              to: emp.email,
              employeeName: emp.full_name ?? 'Colaborador',
              type: r.type,
              startDate: fmt(r.start_date),
              endDate: fmt(r.end_date),
              note: input.manager_note,
              appUrl,
            })
          }
        }

        // Send Slack notification if tenant has Slack integration active
        void (async () => {
          try {
            const { data: slackIntegration } = await ctx.db
              .from('integrations')
              .select('config')
              .eq('tenant_id', ctx.user!.tid)
              .eq('type', 'slack')
              .eq('active', true)
              .maybeSingle()

            const slackConfig = slackIntegration?.config as
              | Record<string, string>
              | null
              | undefined
            if (!slackConfig?.webhook_url) return

            const { data: reviewer } = await ctx.db
              .from('users')
              .select('full_name')
              .eq('id', ctx.user!.sub)
              .single()

            const { sendSlackMessage, buildAbsenceReviewedBlocks } =
              await import('@/lib/integrations/slack')
            const blocks = buildAbsenceReviewedBlocks({
              employeeName: emp?.full_name ?? 'Colaborador',
              type: r.type,
              startDate: fmt(r.start_date),
              endDate: fmt(r.end_date),
              days: Number(r.days_count),
              status: isApproved ? 'approved' : 'rejected',
              reviewerName: reviewer?.full_name ?? 'Manager',
              note: input.manager_note ?? undefined,
              appUrl,
            })
            await sendSlackMessage(
              slackConfig.webhook_url,
              `Ausencia ${isApproved ? 'aprobada' : 'rechazada'} para ${emp?.full_name ?? 'Colaborador'}`,
              blocks,
            )
          } catch {
            // Slack errors are non-critical; don't fail the request
          }
        })()
      }

      return { ok: true }
    }),

  updatePTOBalance: adminProcedure
    .input(
      z.object({
        employee_id: z.string().uuid(),
        year: z.number().int().min(2020).max(2100),
        vacation_days_total: z.number().min(0).optional(),
        vacation_days_used: z.number().min(0).optional(),
        sick_days_total: z.number().min(0).optional(),
        sick_days_used: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        employee_id,
        year,
        vacation_days_total,
        vacation_days_used,
        sick_days_total,
        sick_days_used,
      } = input

      await assertUserInTenant(ctx.db, employee_id, ctx.user!.tid)

      const { data: existing } = await ctx.db
        .from('absence_balances')
        .select('id')
        .eq('employee_id', employee_id)
        .eq('tenant_id', ctx.user!.tid)
        .eq('year', year)
        .maybeSingle()

      if (existing) {
        type BalUpdate = {
          updated_at: string
          vacation_days_total?: number
          vacation_days_used?: number
          sick_days_total?: number
          sick_days_used?: number
        }
        const patch: BalUpdate = { updated_at: new Date().toISOString() }
        if (vacation_days_total !== undefined) patch.vacation_days_total = vacation_days_total
        if (vacation_days_used !== undefined) patch.vacation_days_used = vacation_days_used
        if (sick_days_total !== undefined) patch.sick_days_total = sick_days_total
        if (sick_days_used !== undefined) patch.sick_days_used = sick_days_used
        await ctx.db.from('absence_balances').update(patch).eq('id', existing.id)
      } else {
        await ctx.db.from('absence_balances').insert({
          tenant_id: ctx.user!.tid,
          employee_id,
          year,
          ...(vacation_days_total !== undefined && { vacation_days_total }),
          ...(vacation_days_used !== undefined && { vacation_days_used }),
          ...(sick_days_total !== undefined && { sick_days_total }),
          ...(sick_days_used !== undefined && { sick_days_used }),
        })
      }

      return { ok: true }
    }),

  // ─── Integraciones ────────────────────────────────────────────────────────

  getIntegrations: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('integrations')
      .select('*')
      .eq('tenant_id', ctx.user!.tid)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  saveIntegration: adminProcedure
    .input(
      z.object({
        type: z.enum([
          'slack',
          'jira',
          'asana',
          'github',
          'trello',
          'webhook',
          'teams',
          'whatsapp',
          'google_calendar',
        ]),
        label: z.string().max(100).optional(),
        config: z.record(z.string()),
        active: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: existing } = await ctx.db
        .from('integrations')
        .select('id')
        .eq('tenant_id', ctx.user!.tid)
        .eq('type', input.type)
        .maybeSingle()

      if (existing) {
        const { error } = await ctx.db
          .from('integrations')
          .update({
            label: input.label ?? null,
            config: input.config,
            active: input.active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      } else {
        const { error } = await ctx.db.from('integrations').insert({
          tenant_id: ctx.user!.tid,
          type: input.type,
          label: input.label ?? null,
          config: input.config,
          active: input.active,
        })
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { ok: true }
    }),

  deleteIntegration: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('integrations')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Facturas admin ───────────────────────────────────────────────────────

  getAdminInvoices: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('invoices')
      .select('*, users!invoices_employee_id_fkey(id, full_name, email)')
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // ─── Work locations admin ─────────────────────────────────────────────────

  getTeamWorkLocationSummary: adminProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const date = input.date ?? new Date().toISOString().slice(0, 10)
      const { data, error } = await ctx.db
        .from('work_locations')
        .select('*, users!work_locations_user_id_fkey(id, full_name, position, department)')
        .eq('tenant_id', ctx.user!.tid)
        .eq('date', date)
        .order('created_at', { ascending: false })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // ─── Kudos admin ──────────────────────────────────────────────────────────

  getAdminKudosFeed: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(100) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('kudos')
        .select(
          '*, from_user:users!kudos_from_user_id_fkey(id, full_name), to_user:users!kudos_to_user_id_fkey(id, full_name)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
        .limit(input.limit)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // ─── Pulse surveys admin ──────────────────────────────────────────────────

  listPulseSurveys: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('pulse_surveys')
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createPulseSurvey: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        questions: z
          .array(
            z.object({
              text: z.string().min(1).max(500),
              type: z.enum(['rating', 'text', 'choice']),
              options: z.array(z.string()).optional(),
            }),
          )
          .min(1)
          .max(10),
        ends_at: z.string().optional(),
        activate: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('pulse_surveys')
        .insert({
          tenant_id: ctx.user!.tid,
          created_by: ctx.user!.sub,
          title: input.title,
          questions: input.questions,
          status: input.activate ? 'active' : 'draft',
          starts_at: input.activate ? new Date().toISOString() : null,
          ends_at: input.ends_at ?? null,
        })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updatePulseSurveyStatus: adminProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(['draft', 'active', 'closed']) }))
    .mutation(async ({ ctx, input }) => {
      const patch: { status: string; starts_at?: string } = { status: input.status }
      if (input.status === 'active') patch.starts_at = new Date().toISOString()
      const { error } = await ctx.db
        .from('pulse_surveys')
        .update(patch)
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getPulseSurveyResults: adminProcedure
    .input(z.object({ survey_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [surveyRes, responsesRes] = await Promise.all([
        ctx.db
          .from('pulse_surveys')
          .select('*')
          .eq('id', input.survey_id)
          .eq('tenant_id', ctx.user!.tid)
          .single(),
        ctx.db
          .from('pulse_responses')
          .select('*, users!pulse_responses_user_id_fkey(id, full_name)')
          .eq('survey_id', input.survey_id)
          .order('created_at', { ascending: false }),
      ])
      if (surveyRes.error) throw new TRPCError({ code: 'NOT_FOUND', message: 'Survey not found' })
      return { survey: surveyRes.data, responses: responsesRes.data ?? [] }
    }),

  // ─── Payslips admin ───────────────────────────────────────────────────────

  getPayslips: adminProcedure
    .input(z.object({ employee_id: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('payslips')
        .select('*, users!payslips_employee_id_fkey(id, full_name, email, department, position)')
        .eq('tenant_id', ctx.user!.tid)
        .order('period_start', { ascending: false })
      if (input.employee_id) q = q.eq('employee_id', input.employee_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  createPayslip: adminProcedure
    .input(
      z.object({
        employee_id: z.string().uuid(),
        period_label: z.string().min(1).max(100),
        period_start: z.string(),
        period_end: z.string(),
        gross_amount: z.number().min(0),
        deductions: z.number().min(0).default(0),
        currency: z.string().default('COP'),
        hours_worked: z.number().min(0).optional(),
        notes: z.string().max(2000).optional(),
        issue_now: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const net_amount = input.gross_amount - input.deductions
      const { data, error } = await ctx.db
        .from('payslips')
        .insert({
          tenant_id: ctx.user!.tid,
          employee_id: input.employee_id,
          period_label: input.period_label,
          period_start: input.period_start,
          period_end: input.period_end,
          gross_amount: input.gross_amount,
          deductions: input.deductions,
          net_amount,
          currency: input.currency,
          hours_worked: input.hours_worked ?? null,
          notes: input.notes ?? null,
          status: input.issue_now ? 'issued' : 'draft',
          created_by: ctx.user!.sub,
        })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updatePayslipStatus: adminProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(['draft', 'issued', 'acknowledged']) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('payslips')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── HR Documents admin ───────────────────────────────────────────────────

  getHRDocuments: adminProcedure
    .input(z.object({ employee_id: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('hr_documents')
        .select('*, users!hr_documents_employee_id_fkey(id, full_name, email)')
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
      if (input.employee_id) q = q.eq('employee_id', input.employee_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  createHRDocument: adminProcedure
    .input(
      z.object({
        employee_id: z.string().uuid().optional(),
        title: z.string().min(1).max(300),
        doc_type: z.enum(['contract', 'policy', 'certificate', 'letter', 'other']),
        file_url: z.string().url().optional().or(z.literal('')),
        file_name: z.string().max(300).optional(),
        visibility: z.enum(['employee', 'admin_only', 'all']).default('employee'),
        expires_at: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('hr_documents')
        .insert({
          tenant_id: ctx.user!.tid,
          employee_id: input.employee_id ?? null,
          title: input.title,
          doc_type: input.doc_type,
          file_url: input.file_url || null,
          file_name: input.file_name ?? null,
          visibility: input.visibility,
          expires_at: input.expires_at ?? null,
          created_by: ctx.user!.sub,
        })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  deleteHRDocument: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('hr_documents')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  toggleRequireSignature: adminProcedure
    .input(z.object({ id: z.string().uuid(), requires_signature: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = { requires_signature: input.requires_signature }
      if (!input.requires_signature) {
        patch.signed_at = null
        patch.signature_data = null
        patch.signed_name = null
      }
      const { error } = await ctx.db
        .from('hr_documents')
        .update(patch as any)
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Performance Reviews admin ────────────────────────────────────────────

  listPerformanceReviews: adminProcedure
    .input(z.object({ employee_id: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('performance_reviews')
        .select(
          '*, reviewee:users!performance_reviews_reviewee_id_fkey(id, full_name, position), reviewer:users!performance_reviews_reviewer_id_fkey(id, full_name)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
      if (input.employee_id) q = q.eq('reviewee_id', input.employee_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  createPerformanceReview: adminProcedure
    .input(
      z.object({
        reviewee_id: z.string().uuid(),
        reviewer_id: z.string().uuid(),
        review_type: z.enum(['self', 'manager', 'peer']),
        period_label: z.string().min(1).max(100),
        questions: z
          .array(
            z.object({
              text: z.string().min(1).max(500),
              type: z.enum(['rating', 'text', 'choice']),
              options: z.array(z.string()).optional(),
            }),
          )
          .min(1)
          .max(15),
        due_date: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('performance_reviews')
        .insert({
          tenant_id: ctx.user!.tid,
          reviewee_id: input.reviewee_id,
          reviewer_id: input.reviewer_id,
          review_type: input.review_type,
          period_label: input.period_label,
          questions: input.questions,
          due_date: input.due_date ?? null,
          created_by: ctx.user!.sub,
        })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  submitPerformanceReview: adminProcedure
    .input(
      z.object({
        review_id: z.string().uuid(),
        responses: z.array(
          z.object({
            question_index: z.number().int().min(0),
            rating: z.number().min(1).max(5).optional(),
            text: z.string().max(2000).optional(),
            choice: z.string().max(200).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await (ctx.db as any)
        .from('performance_reviews')
        .update({
          responses: input.responses,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', input.review_id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Expenses admin ───────────────────────────────────────────────────────

  getAdminExpenses: adminProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'reimbursed', 'all']).default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('expenses')
        .select('*, users!expenses_employee_id_fkey(id, full_name, email, department)')
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
      if (input.status !== 'all') q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  updateExpenseStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['approved', 'rejected', 'reimbursed']),
        manager_note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('expenses')
        .update({
          status: input.status,
          manager_note: input.manager_note ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Org chart admin ──────────────────────────────────────────────────────

  updateUserManager: adminProcedure
    .input(z.object({ user_id: z.string().uuid(), manager_id: z.string().uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('users')
        .update({ manager_id: input.manager_id, updated_at: new Date().toISOString() })
        .eq('id', input.user_id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Onboarding admin ─────────────────────────────────────────────────────

  getOnboardingTasks: adminProcedure
    .input(
      z.object({
        employee_id: z.string().uuid().optional(),
        task_type: z.enum(['onboarding', 'offboarding']).default('onboarding'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('onboarding_tasks')
        .select('*, users!onboarding_tasks_employee_id_fkey(id, full_name, email)')
        .eq('tenant_id', ctx.user!.tid)
        .eq('task_type', input.task_type)
        .order('order_index')
      if (input.employee_id) q = q.eq('employee_id', input.employee_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  createOnboardingTask: adminProcedure
    .input(
      z.object({
        employee_id: z.string().uuid(),
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).default('general'),
        due_date: z.string().optional(),
        task_type: z.enum(['onboarding', 'offboarding']).default('onboarding'),
        order_index: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('onboarding_tasks')
        .insert({ ...input, tenant_id: ctx.user!.tid, created_by: ctx.user!.sub })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  deleteOnboardingTask: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('onboarding_tasks')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Training admin ───────────────────────────────────────────────────────

  listTrainingCourses: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('training_courses')
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createTrainingCourse: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        content_url: z.string().url().optional(),
        category: z.string().max(50).default('general'),
        duration_minutes: z.number().int().min(1).optional(),
        is_required: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('training_courses')
        .insert({ ...input, tenant_id: ctx.user!.tid, created_by: ctx.user!.sub })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  deleteTrainingCourse: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('training_courses')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  enrollEmployeeInCourse: adminProcedure
    .input(z.object({ course_id: z.string().uuid(), employee_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('training_enrollments')
        .upsert(
          { ...input, tenant_id: ctx.user!.tid, status: 'enrolled', progress_pct: 0 },
          { onConflict: 'course_id,employee_id' },
        )
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getTrainingEnrollments: adminProcedure
    .input(
      z.object({
        course_id: z.string().uuid().optional(),
        employee_id: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('training_enrollments')
        .select(
          '*, training_courses(*), users!training_enrollments_employee_id_fkey(id, full_name, email)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
      if (input.course_id) q = q.eq('course_id', input.course_id)
      if (input.employee_id) q = q.eq('employee_id', input.employee_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // ─── Benefits admin ───────────────────────────────────────────────────────

  listBenefits: adminProcedure
    .input(z.object({ employee_id: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('benefits')
        .select('*, users!benefits_employee_id_fkey(id, full_name, email)')
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
      if (input.employee_id) q = q.eq('employee_id', input.employee_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  createBenefit: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        category: z.enum([
          'health',
          'transport',
          'food',
          'equipment',
          'insurance',
          'bonus',
          'other',
        ]),
        value: z.number().min(0).optional(),
        currency: z.string().length(3).default('COP'),
        employee_id: z.string().uuid().optional(),
        expires_at: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('benefits')
        .insert({ ...input, tenant_id: ctx.user!.tid, created_by: ctx.user!.sub })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  deleteBenefit: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('benefits')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── 1:1 Meetings admin ───────────────────────────────────────────────────

  list1on1s: adminProcedure
    .input(
      z.object({
        employee_id: z.string().uuid().optional(),
        status: z.enum(['scheduled', 'completed', 'cancelled', 'all']).default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('one_on_ones')
        .select(
          '*, employee:users!one_on_ones_employee_id_fkey(id, full_name, email), manager:users!one_on_ones_manager_id_fkey(id, full_name, email)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('scheduled_at', { ascending: false })
      if (input.employee_id) q = q.eq('employee_id', input.employee_id)
      if (input.status !== 'all') q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  create1on1: adminProcedure
    .input(
      z.object({
        employee_id: z.string().uuid(),
        manager_id: z.string().uuid(),
        scheduled_at: z.string(),
        duration_minutes: z.number().int().min(15).max(120).default(30),
        agenda: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('one_on_ones')
        .insert({ ...input, tenant_id: ctx.user!.tid })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update1on1: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
        notes: z.string().max(2000).optional(),
        action_items: z.array(z.object({ text: z.string(), done: z.boolean() })).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input
      const { error } = await ctx.db
        .from('one_on_ones')
        .update(patch as any)
        .eq('id', id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ── Certificados laborales ──────────────────────────────────────────────
  listCertificateRequests: adminProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'ready', 'delivered', 'all']).default('all'),
        employee_id: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('labor_certificates' as any)
        .select('*, employee:users!labor_certificates_employee_id_fkey(id,full_name,email)')
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
      if (input.status !== 'all') q = q.eq('status', input.status)
      if (input.employee_id) q = q.eq('employee_id', input.employee_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  updateCertificateRequest: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['pending', 'ready', 'delivered']),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = { status: input.status, notes: input.notes ?? null }
      if (input.status === 'ready') patch.ready_at = new Date().toISOString()
      const { error } = await ctx.db
        .from('labor_certificates' as any)
        .update(patch)
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ── Anuncios ─────────────────────────────────────────────────────────────
  listAnnouncements: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('announcements' as any)
      .select('*, author:users!announcements_created_by_fkey(full_name)')
      .eq('tenant_id', ctx.user!.tid)
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createAnnouncement: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
        pinned: z.boolean().default(false),
        published_at: z.string().optional(),
        expires_at: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from('announcements' as any).insert({
        tenant_id: ctx.user!.tid,
        created_by: ctx.user!.sub,
        title: input.title,
        body: input.body,
        pinned: input.pinned,
        published_at: input.published_at ?? new Date().toISOString(),
        expires_at: input.expires_at ?? null,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteAnnouncement: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('announcements' as any)
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ── Calendario de empresa ────────────────────────────────────────────────
  listCompanyEvents: adminProcedure
    .input(z.object({ year: z.number().int().min(2020).max(2100).optional() }))
    .query(async ({ ctx, input }) => {
      const year = input.year ?? new Date().getFullYear()
      const { data, error } = await ctx.db
        .from('company_events' as any)
        .select('*')
        .eq('tenant_id', ctx.user!.tid)
        .gte('event_date', `${year}-01-01`)
        .lte('event_date', `${year}-12-31`)
        .order('event_date', { ascending: true })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  createCompanyEvent: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        event_date: z.string(),
        end_date: z.string().optional(),
        event_type: z
          .enum(['holiday', 'corporate', 'birthday', 'payroll', 'other'])
          .default('corporate'),
        color: z.string().default('#3b82f6'),
        all_day: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from('company_events' as any).insert({
        ...input,
        tenant_id: ctx.user!.tid,
        created_by: ctx.user!.sub,
        description: input.description ?? null,
        end_date: input.end_date ?? null,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteCompanyEvent: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('company_events' as any)
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  delete1on1: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('one_on_ones')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── PEOPLE ANALYTICS ────────────────────────────────────────────────────
  getPeopleAnalytics: adminProcedure.query(async ({ ctx }) => {
    const tid = ctx.user!.tid

    const [usersRes, sessionsRes, absencesRes, reviewsRes] = await Promise.all([
      ctx.db
        .from('users')
        .select('id, full_name, role, department, position, created_at')
        .eq('tenant_id', tid),
      ctx.db
        .from('work_sessions')
        .select('user_id, active_seconds, started_at')
        .eq('tenant_id', tid)
        .gte('started_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
      ctx.db
        .from('absence_requests')
        .select('employee_id, start_date, end_date, type, status')
        .eq('tenant_id', tid)
        .eq('status', 'approved'),
      ctx.db
        .from('performance_reviews')
        .select('reviewee_id, overall_rating, submitted_at')
        .eq('tenant_id', tid),
    ])

    const allUsers = usersRes.data ?? []
    const sessions = sessionsRes.data ?? []
    const absences = absencesRes.data ?? []
    const reviews = reviewsRes.data ?? []

    // Headcount por departamento
    const headcountByDept: Record<string, number> = {}
    for (const u of allUsers) {
      const dept = u.department ?? 'Sin departamento'
      headcountByDept[dept] = (headcountByDept[dept] ?? 0) + 1
    }

    // Tendencia de ingresos (últimos 6 meses)
    const now = new Date()
    const hiresByMonth: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      hiresByMonth[key] = 0
    }
    for (const u of allUsers) {
      if (!u.created_at) continue
      const d = new Date(u.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in hiresByMonth) hiresByMonth[key] = (hiresByMonth[key] ?? 0) + 1
    }

    // Promedio de horas trabajadas por usuario (últimos 90 días)
    const hoursByUser: Record<string, number> = {}
    for (const s of sessions) {
      hoursByUser[s.user_id] = (hoursByUser[s.user_id] ?? 0) + (s.active_seconds ?? 0)
    }
    const avgHours =
      Object.values(hoursByUser).length > 0
        ? Object.values(hoursByUser).reduce((a, b) => a + b, 0) /
          Object.values(hoursByUser).length /
          3600
        : 0

    // Ausencias por tipo
    const absencesByType: Record<string, number> = {}
    for (const a of absences) {
      const t = (a as any).type ?? 'otro'
      absencesByType[t] = (absencesByType[t] ?? 0) + 1
    }

    // Rating promedio de performance
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + ((r as any).overall_rating ?? 0), 0) / reviews.length
        : null

    // Usuarios activos (sesión en últimos 30 días)
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const activeSet = new Set(
      sessions.filter((s) => (s.started_at ?? '') >= cutoff30).map((s) => s.user_id),
    )

    return {
      headcount: allUsers.length,
      activeCount: activeSet.size,
      headcountByDept: Object.entries(headcountByDept).sort((a, b) => b[1] - a[1]),
      hiresByMonth: Object.entries(hiresByMonth).map(([month, count]) => ({ month, count })),
      avgHoursLast90d: Math.round(avgHours * 10) / 10,
      absencesByType: Object.entries(absencesByType).sort((a, b) => b[1] - a[1]),
      avgPerformanceRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      roleDistribution: Object.entries(
        allUsers.reduce<Record<string, number>>((acc, u) => {
          acc[u.role ?? 'employee'] = (acc[u.role ?? 'employee'] ?? 0) + 1
          return acc
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    }
  }),

  // ─── PAYROLL ENGINE ───────────────────────────────────────────────────────
  listPayrollPeriods: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('payroll_periods' as any)
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .order('period_start', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createPayrollPeriod: adminProcedure
    .input(
      z.object({
        label: z.string().min(1),
        period_start: z.string(),
        period_end: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('payroll_periods' as any)
        .insert({ ...input, tenant_id: ctx.user!.tid, created_by: ctx.user!.sub })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updatePayrollPeriodStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['draft', 'processing', 'paid', 'cancelled']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('payroll_periods' as any)
        .update({ status: input.status })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  listPayslips: adminProcedure
    .input(z.object({ period_id: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('payslips' as any)
        .select('*, users!employee_id(full_name, department, position)')
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
      if (input.period_id) q = q.eq('period_id', input.period_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  upsertPayslip: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        period_id: z.string().uuid().optional(),
        employee_id: z.string().uuid(),
        period_label: z.string(),
        period_start: z.string(),
        period_end: z.string(),
        base_salary: z.number().default(0),
        worked_days: z.number().int().default(0),
        overtime_hours: z.number().default(0),
        overtime_value: z.number().default(0),
        transportation_allowance: z.number().default(0),
        prima: z.number().default(0),
        cesantias: z.number().default(0),
        intereses_cesantias: z.number().default(0),
        vacaciones: z.number().default(0),
        health_employee: z.number().default(0),
        pension_employee: z.number().default(0),
        health_employer: z.number().default(0),
        pension_employer: z.number().default(0),
        arl: z.number().default(0),
        icbf: z.number().default(0),
        sena: z.number().default(0),
        cajas_compensacion: z.number().default(0),
        other_earnings: z.number().default(0),
        other_deductions: z.number().default(0),
        gross_amount: z.number().default(0),
        deductions: z.number().default(0),
        net_amount: z.number().default(0),
        currency: z.string().default('COP'),
        notes: z.string().optional(),
        status: z.enum(['draft', 'issued', 'acknowledged', 'paid']).default('draft'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      await assertUserInTenant(ctx.db, input.employee_id, ctx.user!.tid)
      const payload = { ...rest, tenant_id: ctx.user!.tid, created_by: ctx.user!.sub }
      let error
      if (id) {
        ;({ error } = await ctx.db
          .from('payslips' as any)
          .update(payload)
          .eq('id', id)
          .eq('tenant_id', ctx.user!.tid))
      } else {
        ;({ error } = await ctx.db.from('payslips' as any).insert(payload))
      }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Send email when payslip is issued
      if (input.status === 'issued') {
        const { data: emp } = await ctx.db
          .from('users')
          .select('full_name, email')
          .eq('id', input.employee_id)
          .eq('tenant_id', ctx.user!.tid)
          .single()
        if (emp?.email) {
          void sendPayslipIssuedEmail({
            to: emp.email,
            employeeName: emp.full_name ?? 'Colaborador',
            periodLabel: input.period_label,
            netAmount: input.net_amount,
            currency: input.currency,
            appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.bcwork.co',
          })
        }
      }

      return { ok: true }
    }),

  // ─── REPORT BUILDER ───────────────────────────────────────────────────────
  runCustomReport: adminProcedure
    .input(
      z.object({
        report_type: z.enum(['attendance', 'productivity', 'absences', 'payroll', 'overview']),
        date_from: z.string(),
        date_to: z.string(),
        department: z.string().optional(),
        user_ids: z.array(z.string().uuid()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tid = ctx.user!.tid
      const { report_type, date_from, date_to, department } = input

      if (report_type === 'attendance') {
        let q = ctx.db
          .from('work_sessions')
          .select(
            'user_id, started_at, ended_at, duration_seconds, users!user_id(full_name, department)',
          )
          .eq('tenant_id', tid)
          .gte('started_at', date_from)
          .lte('started_at', date_to)
        const { data, error } = await q
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        return { type: 'attendance', rows: data ?? [] }
      }

      if (report_type === 'productivity') {
        let q = ctx.db
          .from('daily_user_metrics')
          .select(
            'user_id, date, productive_seconds, neutral_seconds, unproductive_seconds, productivity_score, users!user_id(full_name, department)',
          )
          .eq('tenant_id', tid)
          .gte('date', date_from)
          .lte('date', date_to)
        if (department) q = q.eq('users.department', department)
        const { data, error } = await q
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        return { type: 'productivity', rows: data ?? [] }
      }

      if (report_type === 'absences') {
        const { data, error } = await ctx.db
          .from('absence_requests')
          .select('*, users!user_id(full_name, department)')
          .eq('tenant_id', tid)
          .gte('start_date', date_from)
          .lte('start_date', date_to)
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        return { type: 'absences', rows: data ?? [] }
      }

      if (report_type === 'payroll') {
        const { data, error } = await ctx.db
          .from('payslips' as any)
          .select('*, users!employee_id(full_name, department, position)')
          .eq('tenant_id', tid)
          .gte('period_start', date_from)
          .lte('period_end', date_to)
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
        return { type: 'payroll', rows: data ?? [] }
      }

      // overview: combinar asistencia + productividad
      const [sessRes, metRes, usrRes] = await Promise.all([
        ctx.db
          .from('work_sessions')
          .select('user_id, active_seconds')
          .eq('tenant_id', tid)
          .gte('started_at', date_from)
          .lte('started_at', date_to),
        ctx.db
          .from('daily_user_metrics')
          .select('user_id, productivity_ratio')
          .eq('tenant_id', tid)
          .gte('metric_date', date_from)
          .lte('metric_date', date_to),
        ctx.db.from('users').select('id, full_name, department, position').eq('tenant_id', tid),
      ])

      const totalSecsByUser: Record<string, number> = {}
      for (const s of sessRes.data ?? []) {
        totalSecsByUser[s.user_id] = (totalSecsByUser[s.user_id] ?? 0) + (s.active_seconds ?? 0)
      }
      const scoresByUser: Record<string, number[]> = {}
      for (const m of (metRes.data ?? []) as any[]) {
        const uid = m.user_id as string
        if (!scoresByUser[uid]) scoresByUser[uid] = []
        scoresByUser[uid]!.push((m.productivity_ratio as number) ?? 0)
      }

      const rows = (usrRes.data ?? []).map((u) => {
        const uid = u.id ?? ''
        const scores = scoresByUser[uid]
        return {
          user_id: uid,
          full_name: u.full_name,
          department: u.department,
          position: u.position,
          total_hours: Math.round(((totalSecsByUser[uid] ?? 0) / 3600) * 10) / 10,
          avg_productivity: scores
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null,
        }
      })

      return { type: 'overview', rows }
    }),

  listReportTemplates: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('scheduled_reports')
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // ─── CONTRACT MANAGEMENT ─────────────────────────────────────────────────
  listContractTemplates: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('contract_templates' as any)
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  upsertContractTemplate: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        contract_type: z.enum([
          'indefinido',
          'fijo',
          'obra',
          'prestacion_servicios',
          'aprendizaje',
        ]),
        body_html: z.string().default(''),
        variables: z.array(z.string()).default([]),
        is_active: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, variables, ...rest } = input
      const payload = {
        ...rest,
        variables: JSON.stringify(variables),
        tenant_id: ctx.user!.tid,
        created_by: ctx.user!.sub,
      }
      let error
      if (id) {
        ;({ error } = await ctx.db
          .from('contract_templates' as any)
          .update(payload)
          .eq('id', id)
          .eq('tenant_id', ctx.user!.tid))
      } else {
        ;({ error } = await ctx.db.from('contract_templates' as any).insert(payload))
      }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  listContracts: adminProcedure
    .input(z.object({ status: z.string().optional(), employee_id: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('employment_contracts' as any)
        .select('*, users!employee_id(full_name, department, position)')
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
      if (input.status) q = q.eq('status', input.status)
      if (input.employee_id) q = q.eq('employee_id', input.employee_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  upsertContract: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        employee_id: z.string().uuid(),
        template_id: z.string().uuid().optional(),
        contract_type: z.enum([
          'indefinido',
          'fijo',
          'obra',
          'prestacion_servicios',
          'aprendizaje',
        ]),
        start_date: z.string(),
        end_date: z.string().optional(),
        salary: z.number().optional(),
        position: z.string().optional(),
        status: z
          .enum(['draft', 'sent', 'signed', 'active', 'terminated', 'expired'])
          .default('draft'),
        document_url: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      await assertUserInTenant(ctx.db, input.employee_id, ctx.user!.tid)
      const payload = { ...rest, tenant_id: ctx.user!.tid, created_by: ctx.user!.sub }
      let error
      if (id) {
        ;({ error } = await ctx.db
          .from('employment_contracts' as any)
          .update(payload)
          .eq('id', id)
          .eq('tenant_id', ctx.user!.tid))
      } else {
        ;({ error } = await ctx.db.from('employment_contracts' as any).insert(payload))
      }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  updateContractStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['draft', 'sent', 'signed', 'active', 'terminated', 'expired']),
        termination_reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const payload: Record<string, unknown> = { status: input.status }
      if (input.status === 'signed') payload.signed_at = new Date().toISOString()
      if (input.status === 'terminated') {
        payload.terminated_at = new Date().toISOString()
        payload.termination_reason = input.termination_reason
      }
      const { error } = await ctx.db
        .from('employment_contracts' as any)
        .update(payload)
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── COMPLIANCE PANEL ─────────────────────────────────────────────────────
  listComplianceRequirements: adminProcedure
    .input(
      z.object({
        category: z.string().optional(),
        status: z.string().optional(),
        employee_id: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('compliance_requirements' as any)
        .select('*, users!employee_id(full_name, department)')
        .eq('tenant_id', ctx.user!.tid)
        .order('due_date', { ascending: true })
      if (input.category) q = q.eq('category', input.category)
      if (input.status) q = q.eq('status', input.status)
      if (input.employee_id) q = q.eq('employee_id', input.employee_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  upsertComplianceRequirement: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        employee_id: z.string().uuid().optional(),
        category: z.enum([
          'sgsst',
          'arl',
          'eps',
          'pension',
          'caja_compensacion',
          'contrato',
          'induccion',
          'examen_medico',
          'capacitacion',
          'otro',
        ]),
        title: z.string().min(1),
        description: z.string().optional(),
        due_date: z.string().optional(),
        is_company_wide: z.boolean().default(false),
        document_url: z.string().optional(),
        status: z.enum(['pending', 'completed', 'overdue', 'na']).default('pending'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      if (input.employee_id) await assertUserInTenant(ctx.db, input.employee_id, ctx.user!.tid)
      const payload = { ...rest, tenant_id: ctx.user!.tid, created_by: ctx.user!.sub }
      let error
      if (id) {
        ;({ error } = await ctx.db
          .from('compliance_requirements' as any)
          .update(payload)
          .eq('id', id)
          .eq('tenant_id', ctx.user!.tid))
      } else {
        ;({ error } = await ctx.db.from('compliance_requirements' as any).insert(payload))
      }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  completeComplianceRequirement: adminProcedure
    .input(z.object({ id: z.string().uuid(), document_url: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('compliance_requirements' as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          document_url: input.document_url,
        })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteComplianceRequirement: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('compliance_requirements' as any)
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── SETTINGS: notification preferences ──────────────────────────────────

  getNotificationPreferences: adminProcedure.query(async ({ ctx }) => {
    const { data } = await (ctx.db as any)
      .from('tenants')
      .select('notification_preferences')
      .eq('id', ctx.user!.tid)
      .single()
    return (data?.notification_preferences ?? {}) as Record<string, boolean>
  }),

  updateNotificationPreferences: adminProcedure
    .input(z.record(z.string(), z.boolean()))
    .mutation(async ({ ctx, input }) => {
      const { error } = await (ctx.db as any)
        .from('tenants')
        .update({ notification_preferences: input, updated_at: new Date().toISOString() })
        .eq('id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── BILLING ─────────────────────────────────────────────────────────────

  getBillingInfo: adminProcedure.query(async ({ ctx }) => {
    const [licenseRes, seatsRes, tenantRes] = await Promise.all([
      ctx.db
        .from('licenses')
        .select('*, plans(code, name, monthly_price_per_seat_cop, features)')
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      ctx.db
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', ctx.user!.tid)
        .eq('status', 'active'),
      ctx.db
        .from('tenants')
        .select('legal_name, nit, contact_email')
        .eq('id', ctx.user!.tid)
        .single(),
    ])

    const license = licenseRes.data
    const trialEndsAt = license?.trial_ends_at ? new Date(license.trial_ends_at) : null
    const daysLeft = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000))
      : null

    return {
      license: license ?? null,
      plan: (license as any)?.plans ?? null,
      seatsUsed: seatsRes.count ?? 0,
      seatsTotal: license?.seats_total ?? 0,
      daysLeft,
      status: license?.status ?? 'trial',
      tenant: tenantRes.data ?? null,
    }
  }),

  listBillingEvents: adminProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.db
      .from('billing_events')
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .order('occurred_at', { ascending: false })
      .limit(50)
    return data ?? []
  }),

  // ─── RECRUITMENT / ATS ────────────────────────────────────────────────────

  listHiringRequests: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await (ctx.db as any)
      .from('hiring_requests')
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  upsertHiringRequest: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        title: z.string().min(1).max(200),
        department: z.string().max(100).optional(),
        description: z.string().max(2000).optional(),
        requirements: z.string().max(2000).optional(),
        seniority_level: z.enum(['junior', 'mid', 'senior', 'lead', 'director']).default('mid'),
        headcount: z.number().int().min(1).default(1),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
        status: z.enum(['open', 'in_progress', 'on_hold', 'closed', 'cancelled']).default('open'),
        location_type: z.enum(['remote', 'hybrid', 'onsite']).default('remote'),
        salary_min: z.number().optional(),
        salary_max: z.number().optional(),
        currency: z.string().default('COP'),
        due_date: z.string().optional(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const payload = { ...rest, tenant_id: ctx.user!.tid, requested_by: ctx.user!.sub }
      let error
      if (id) {
        ;({ error } = await (ctx.db as any)
          .from('hiring_requests')
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('tenant_id', ctx.user!.tid))
      } else {
        ;({ error } = await (ctx.db as any).from('hiring_requests').insert(payload))
      }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteHiringRequest: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await (ctx.db as any)
        .from('hiring_requests')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  listCandidates: adminProcedure
    .input(z.object({ hiring_request_id: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      let q = (ctx.db as any)
        .from('job_candidates')
        .select('*')
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
      if (input.hiring_request_id) q = q.eq('hiring_request_id', input.hiring_request_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  upsertCandidate: adminProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        hiring_request_id: z.string().uuid().optional(),
        full_name: z.string().min(1).max(200),
        email: z.string().email().optional(),
        phone: z.string().max(30).optional(),
        cv_url: z.string().url().optional(),
        linkedin_url: z.string().url().optional(),
        source: z.string().max(50).optional(),
        stage: z
          .enum(['applied', 'screening', 'interview', 'technical', 'offer', 'hired', 'rejected'])
          .default('applied'),
        stage_notes: z.string().max(1000).optional(),
        expected_salary: z.number().optional(),
        rejected_reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const payload = { ...rest, tenant_id: ctx.user!.tid }
      let error
      if (id) {
        ;({ error } = await (ctx.db as any)
          .from('job_candidates')
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('tenant_id', ctx.user!.tid))
      } else {
        ;({ error } = await (ctx.db as any).from('job_candidates').insert(payload))
      }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  updateCandidateStage: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        stage: z.enum([
          'applied',
          'screening',
          'interview',
          'technical',
          'offer',
          'hired',
          'rejected',
        ]),
        stage_notes: z.string().max(1000).optional(),
        rejected_reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const { error } = await (ctx.db as any)
        .from('job_candidates')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteCandidate: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await (ctx.db as any)
        .from('job_candidates')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Zona de peligro ─────────────────────────────────────────────────────

  exportData: adminProcedure.mutation(async ({ ctx }) => {
    const tid = ctx.user!.tid
    const db = ctx.db

    const [
      { data: tenant },
      { data: users },
      { data: teams },
      { data: teamMembers },
      { data: workSessions },
      { data: absenceRequests },
      { data: payrollPeriods },
      { data: payslips },
      { data: projects },
      { data: projectTasks },
      { data: trainingCourses },
      { data: trainingEnrollments },
      { data: devices },
      { data: alertRules },
      { data: auditLogs },
    ] = await Promise.all([
      db.from('tenants').select('*').eq('id', tid).single(),
      db.from('users').select('*').eq('tenant_id', tid),
      db.from('teams').select('*').eq('tenant_id', tid),
      db.from('team_members').select('*').eq('tenant_id', tid),
      db
        .from('work_sessions')
        .select('*')
        .eq('tenant_id', tid)
        .order('started_at', { ascending: false })
        .limit(5000),
      db.from('absence_requests').select('*').eq('tenant_id', tid),
      db.from('payroll_periods').select('*').eq('tenant_id', tid),
      db.from('payslips').select('*').eq('tenant_id', tid),
      db.from('projects').select('*').eq('tenant_id', tid),
      db.from('project_tasks').select('*').eq('tenant_id', tid),
      db.from('training_courses').select('*').eq('tenant_id', tid),
      db.from('training_enrollments').select('*').eq('tenant_id', tid),
      db.from('agent_devices').select('*').eq('tenant_id', tid),
      db.from('alert_rules').select('*').eq('tenant_id', tid),
      db
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tid)
        .order('occurred_at', { ascending: false })
        .limit(1000),
    ])

    await logAudit(db, {
      tenantId: tid,
      actorUserId: ctx.user!.sub,
      action: 'tenant.data_exported',
      entityType: 'tenant',
      entityId: tid,
      ipInet: ctx.ip,
      userAgent: ctx.userAgent,
    })

    const data: Record<string, unknown[]> = {
      tenants: tenant ? [tenant] : [],
      users: users ?? [],
      teams: teams ?? [],
      team_members: teamMembers ?? [],
      agent_devices: devices ?? [],
      projects: projects ?? [],
      project_tasks: projectTasks ?? [],
      training_courses: trainingCourses ?? [],
      training_enrollments: trainingEnrollments ?? [],
      payroll_periods: payrollPeriods ?? [],
      payslips: payslips ?? [],
      absence_requests: absenceRequests ?? [],
      alert_rules: alertRules ?? [],
      work_sessions: workSessions ?? [],
      audit_logs: auditLogs ?? [],
    }

    const bcw = encodeBcw({
      format: 'BCW',
      version: BCW_VERSION,
      exported_at: new Date().toISOString(),
      tenant_id: tid,
      data,
      meta: { counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])) },
    })

    return { filename: `bcwork-backup-${new Date().toISOString().slice(0, 10)}.bcw`, bcw }
  }),

  // Restaura un backup .bcw en el MISMO tenant (upsert por id, orden FK-seguro).
  importData: tenantAdminProcedure
    .input(z.object({ bcw: z.string().min(10).max(50_000_000) }))
    .mutation(async ({ ctx, input }) => {
      const tid = ctx.user!.tid
      const db = ctx.db

      let payload
      try {
        payload = decodeBcw(input.bcw)
      } catch (e) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: e instanceof Error ? e.message : 'Archivo .bcw inválido',
        })
      }
      if (payload.tenant_id !== tid) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Este backup pertenece a otra empresa y no puede restaurarse aquí.',
        })
      }

      // Columnas generadas que NO se pueden insertar.
      const GENERATED: Record<string, string[]> = { agent_devices: ['platform'] }
      // Orden FK-seguro: padres antes que hijos.
      const ORDER = [
        'tenants',
        'users',
        'teams',
        'agent_devices',
        'projects',
        'training_courses',
        'payroll_periods',
        'alert_rules',
        'team_members',
        'project_tasks',
        'training_enrollments',
        'payslips',
        'absence_requests',
        'work_sessions',
        'audit_logs',
      ]

      const result: Record<string, { restored: number } | { error: string }> = {}
      for (const table of ORDER) {
        const rows = (payload.data[table] as Record<string, unknown>[] | undefined) ?? []
        if (rows.length === 0) continue
        // Seguridad: solo filas de este tenant + limpiar columnas generadas.
        const strip = GENERATED[table] ?? []
        const clean = rows
          .filter((r) => !('tenant_id' in r) || r.tenant_id === tid || table === 'tenants')
          .map((r) => {
            const copy = { ...r }
            for (const c of strip) delete copy[c]
            return copy
          })
        if (clean.length === 0) continue
        // Tabla dinámica: escapamos el tipado literal de supabase-js.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q = (db as any).from(table)
        const { error } = await q.upsert(clean, { onConflict: 'id' })
        result[table] = error ? { error: error.message } : { restored: clean.length }
      }

      await logAudit(db, {
        tenantId: tid,
        actorUserId: ctx.user!.sub,
        action: 'tenant.data_imported',
        entityType: 'tenant',
        entityId: tid,
        ipInet: ctx.ip,
        userAgent: ctx.userAgent,
        after: result as Record<string, unknown>,
      })

      return { imported_from: payload.exported_at, result }
    }),

  cancelSubscription: adminProcedure.mutation(async ({ ctx }) => {
    const tid = ctx.user!.tid
    const { error } = await ctx.db
      .from('tenants')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', tid)
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    await logAudit(ctx.db, {
      tenantId: tid,
      actorUserId: ctx.user!.sub,
      action: 'tenant.subscription_cancelled',
      entityType: 'tenant',
      entityId: tid,
      ipInet: ctx.ip,
      userAgent: ctx.userAgent,
    })
    return { ok: true }
  }),

  deleteAccount: adminProcedure
    .input(z.object({ confirmation: z.literal('ELIMINAR') }))
    .mutation(async ({ ctx }) => {
      const tid = ctx.user!.tid
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (ctx.db.rpc as any)('delete_tenant_data', { p_tenant_id: tid })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),
})
