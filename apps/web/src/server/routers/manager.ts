import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, requireRole } from '../trpc'

const managerProcedure = protectedProcedure.use(requireRole('tenant_admin', 'manager'))

export const managerRouter = router({
  // ─── Equipo ───────────────────────────────────────────────────────────────

  getMyTeams: managerProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid
    const userId = ctx.user!.sub

    if (ctx.user!.role === 'tenant_admin') {
      const { data, error } = await ctx.db
        .from('teams')
        .select('id, name, description, created_at')
        .eq('tenant_id', tenantId)
        .order('name')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }

    // Manager sees all teams they belong to (any role)
    const { data, error } = await ctx.db
      .from('team_members')
      .select('teams(id, name, description, created_at)')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    return (data ?? []).map((r) => r.teams).filter(Boolean) as unknown as Array<{
      id: string
      name: string
      description: string | null
      created_at: string
    }>
  }),

  getTeamMembers: managerProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid

      const { data, error } = await ctx.db
        .from('team_members')
        .select(
          'user_id, role, users(id, full_name, email, status, department, position, last_login_at, mfa_enabled)',
        )
        .eq('team_id', input.teamId)
        .eq('tenant_id', tenantId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return (data ?? []).map((m) => ({
        ...(m.users as unknown as Record<string, unknown>),
        team_role: m.role,
      })) as unknown as Array<{
        id: string
        full_name: string | null
        email: string
        status: string
        department: string | null
        position: string | null
        last_login_at: string | null
        mfa_enabled: boolean
        team_role: string
      }>
    }),

  // ─── Sesiones activas ─────────────────────────────────────────────────────

  getActiveSessions: managerProcedure
    .input(z.object({ teamId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid

      let memberIds: string[] | null = null
      if (input.teamId) {
        const { data: members } = await ctx.db
          .from('team_members')
          .select('user_id')
          .eq('team_id', input.teamId)
          .eq('tenant_id', tenantId)
        memberIds = (members ?? []).map((m) => m.user_id)
        if (memberIds.length === 0) return []
      }

      let query = ctx.db
        .from('work_sessions')
        .select(
          'id, user_id, started_at, active_seconds, idle_seconds, location_type, users(full_name, email)',
        )
        .eq('tenant_id', tenantId)
        .is('ended_at', null)
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('started_at', { ascending: false })

      if (memberIds) {
        query = query.in('user_id', memberIds)
      }

      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const now = Date.now()
      return (data ?? []).map((s) => ({
        id: s.id,
        user_id: s.user_id,
        full_name: (s.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
        email: (s.users as unknown as { email: string } | null)?.email ?? '',
        started_at: s.started_at,
        elapsed_seconds: Math.round((now - new Date(s.started_at).getTime()) / 1000),
        active_seconds: s.active_seconds ?? 0,
        idle_seconds: s.idle_seconds ?? 0,
        location_type: (s.location_type as string | null) ?? 'remote',
      }))
    }),

  // ─── Métricas del equipo ──────────────────────────────────────────────────

  getTeamMetrics: managerProcedure
    .input(
      z.object({
        teamId: z.string().uuid().optional(),
        days: z.number().int().min(1).max(90).default(7),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

      let memberIds: string[] | null = null
      if (input.teamId) {
        const { data: members } = await ctx.db
          .from('team_members')
          .select('user_id')
          .eq('team_id', input.teamId)
          .eq('tenant_id', tenantId)
        memberIds = (members ?? []).map((m) => m.user_id)
        if (memberIds.length === 0) return { users: [], summary: null }
      }

      let query = ctx.db
        .from('daily_user_metrics')
        .select(
          'user_id, metric_date, active_seconds, productive_seconds, non_productive_seconds, productivity_ratio, overtime_seconds, focus_score',
        )
        .eq('tenant_id', tenantId)
        .gte('metric_date', from)
        .order('metric_date', { ascending: false })

      if (memberIds) {
        query = query.in('user_id', memberIds)
      }

      const { data: metrics, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const userIds = [...new Set((metrics ?? []).map((m) => m.user_id))]
      const { data: users } = await ctx.db
        .from('users')
        .select('id, full_name, email, department')
        .in('id', userIds)
        .eq('tenant_id', tenantId)

      const userMap = new Map((users ?? []).map((u) => [u.id, u]))

      const byUser = new Map<
        string,
        {
          active: number
          productive: number
          overtime: number
          days: number
          ratios: number[]
          focusScores: number[]
        }
      >()
      for (const m of metrics ?? []) {
        const u = byUser.get(m.user_id) ?? {
          active: 0,
          productive: 0,
          overtime: 0,
          days: 0,
          ratios: [],
          focusScores: [],
        }
        u.active += m.active_seconds ?? 0
        u.productive += m.productive_seconds ?? 0
        u.overtime += m.overtime_seconds ?? 0
        u.days += 1
        if (m.productivity_ratio != null) u.ratios.push(Number(m.productivity_ratio))
        if (m.focus_score != null) u.focusScores.push(Number(m.focus_score))
        byUser.set(m.user_id, u)
      }

      const userStats = Array.from(byUser.entries())
        .map(([uid, v]) => {
          const info = userMap.get(uid)
          const avgRatio =
            v.ratios.length > 0 ? v.ratios.reduce((a, b) => a + b, 0) / v.ratios.length : 0
          const avgFocus =
            v.focusScores.length > 0
              ? v.focusScores.reduce((a, b) => a + b, 0) / v.focusScores.length
              : null
          return {
            user_id: uid,
            full_name: info?.full_name ?? null,
            email: info?.email ?? '',
            department: info?.department ?? null,
            active_seconds: v.active,
            productive_seconds: v.productive,
            productivity_ratio: avgRatio,
            overtime_seconds: v.overtime,
            days_active: v.days,
            focus_score: avgFocus,
          }
        })
        .sort((a, b) => b.active_seconds - a.active_seconds)

      const totalActive = userStats.reduce((s, u) => s + u.active_seconds, 0)
      const avgProductivity =
        userStats.length > 0
          ? userStats.reduce((s, u) => s + u.productivity_ratio, 0) / userStats.length
          : 0

      return {
        users: userStats,
        summary: {
          total_active_seconds: totalActive,
          avg_productivity_ratio: avgProductivity,
          members_count: userStats.length,
          days: input.days,
        },
      }
    }),

  // ─── Solicitudes de corrección ───────────────────────────────────────────

  getActivityEdits: managerProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.db
        .from('activity_edits')
        .select(
          'id, applies_to_date, edit_type, reason, review_note, status, created_at, reviewed_at, user_id, users!activity_edits_user_id_fkey(full_name, email)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
        .limit(100)

      if (input.status !== 'all') {
        query = query.eq('status', input.status)
      }

      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return (data ?? []).map((e) => ({
        id: e.id,
        applies_to_date: e.applies_to_date,
        edit_type: e.edit_type,
        reason: e.reason,
        review_note: e.review_note,
        status: e.status,
        created_at: e.created_at,
        reviewed_at: e.reviewed_at,
        user_id: e.user_id,
        full_name: (e.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
        email: (e.users as unknown as { email: string } | null)?.email ?? '',
      }))
    }),

  reviewActivityEdit: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['approved', 'rejected']),
        review_note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: edit, error: fetchError } = await ctx.db
        .from('activity_edits')
        .select('user_id, applies_to_date')
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .single()

      if (fetchError || !edit)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitud no encontrada' })

      const { error } = await ctx.db
        .from('activity_edits')
        .update({
          status: input.status,
          review_note: input.review_note ?? null,
          reviewed_by: ctx.user!.sub,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Notificar al empleado
      const statusText = input.status === 'approved' ? 'aprobada' : 'rechazada'
      await ctx.db.from('notifications').insert({
        tenant_id: ctx.user!.tid,
        user_id: edit.user_id,
        channel: 'manager_message' as const,
        title: `Solicitud de corrección ${statusText}`,
        body: input.review_note ?? `Tu solicitud del ${edit.applies_to_date} fue ${statusText}.`,
      })

      return { ok: true }
    }),

  getPendingCorrectionsCount: managerProcedure.query(async ({ ctx }) => {
    const { count, error } = await ctx.db
      .from('activity_edits')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.user!.tid)
      .eq('status', 'pending')

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { count: count ?? 0 }
  }),

  // ─── Estado del equipo hoy ────────────────────────────────────────────────

  getTeamStatus: managerProcedure
    .input(z.object({ teamId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const today = new Date().toISOString().slice(0, 10)

      let membersQuery = ctx.db
        .from('users')
        .select('id, full_name, email, department')
        .eq('tenant_id', tenantId)
        .in('role', ['employee', 'manager'])
        .eq('status', 'active')

      if (input.teamId) {
        const { data: teamMembers } = await ctx.db
          .from('team_members')
          .select('user_id')
          .eq('team_id', input.teamId)
          .eq('tenant_id', tenantId)
        const ids = (teamMembers ?? []).map((m) => m.user_id)
        if (ids.length === 0) return { active: [], inactive: [] }
        membersQuery = membersQuery.in('id', ids)
      }

      const [membersRes, activeSessionsRes] = await Promise.all([
        membersQuery,
        ctx.db
          .from('work_sessions')
          .select('user_id, started_at, active_seconds')
          .eq('tenant_id', tenantId)
          .gte('started_at', today)
          .is('ended_at', null),
      ])

      const activeUserIds = new Set((activeSessionsRes.data ?? []).map((s) => s.user_id))
      const members = membersRes.data ?? []

      return {
        active: members.filter((m) => activeUserIds.has(m.id)),
        inactive: members.filter((m) => !activeUserIds.has(m.id)),
      }
    }),

  getUserDetail: managerProcedure
    .input(
      z.object({ userId: z.string().uuid(), days: z.number().int().min(1).max(90).default(14) }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

      const [userRes, metricsRes, devicesRes] = await Promise.all([
        ctx.db
          .from('users')
          .select(
            'id, full_name, email, status, department, position, last_login_at, mfa_enabled, must_change_password',
          )
          .eq('id', input.userId)
          .eq('tenant_id', tenantId)
          .single(),
        ctx.db
          .from('daily_user_metrics')
          .select(
            'metric_date, active_seconds, productive_seconds, non_productive_seconds, productivity_ratio, focus_score, overtime_seconds, apps_top, domains_top',
          )
          .eq('tenant_id', tenantId)
          .eq('user_id', input.userId)
          .gte('metric_date', from)
          .order('metric_date', { ascending: true }),
        ctx.db
          .from('agent_devices')
          .select('id, name, platform, hostname, last_seen_at, revoked_at')
          .eq('tenant_id', tenantId)
          .eq('user_id', input.userId)
          .is('revoked_at', null),
      ])

      if (userRes.error || !userRes.data)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' })

      return {
        user: userRes.data,
        metrics: (metricsRes.data ?? []).map((m) => ({
          ...m,
          productivity_ratio: Number(m.productivity_ratio ?? 0),
          focus_score: m.focus_score != null ? Number(m.focus_score) : null,
        })),
        devices: devicesRes.data ?? [],
      }
    }),
})
