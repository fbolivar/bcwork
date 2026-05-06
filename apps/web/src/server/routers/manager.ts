import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, requireRole } from '../trpc'
import { broadcastNotification, broadcastNotificationToMany } from '@/lib/realtime-broadcast'

// ─── Geo helpers ──────────────────────────────────────────────────────────────

function isPrivateIP(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1') return true
  const p = ip.split('.').map(Number)
  if (p.length !== 4) return false
  const a = p[0] ?? 0
  const b = p[1] ?? 0
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

type GeoInfo = {
  countryCode: string
  country: string
  city: string
  lat: number
  lon: number
  ts: number
}
const _geoCache = new Map<string, GeoInfo>()
const GEO_TTL = 6 * 3600 * 1000

async function geolocateBatch(ips: string[]): Promise<Map<string, GeoInfo>> {
  const result = new Map<string, GeoInfo>()
  const toFetch: string[] = []
  for (const ip of ips) {
    const c = _geoCache.get(ip)
    if (c && Date.now() - c.ts < GEO_TTL) result.set(ip, c)
    else toFetch.push(ip)
  }
  if (toFetch.length > 0) {
    // ipinfo.io: HTTPS, free 50k/month, no key needed
    await Promise.allSettled(
      toFetch.slice(0, 20).map(async (ip) => {
        try {
          const res = await fetch(`https://ipinfo.io/${ip}/json`, {
            signal: AbortSignal.timeout(5000),
          })
          const geo = (await res.json()) as { city?: string; country?: string; loc?: string }
          if (geo.loc) {
            const [latStr, lonStr] = geo.loc.split(',')
            const lat = parseFloat(latStr ?? '')
            const lon = parseFloat(lonStr ?? '')
            if (!isNaN(lat) && !isNaN(lon)) {
              const info: GeoInfo = {
                countryCode: geo.country ?? '',
                country: geo.country ?? '',
                city: geo.city ?? '',
                lat,
                lon,
                ts: Date.now(),
              }
              _geoCache.set(ip, info)
              result.set(ip, info)
            }
          }
        } catch {
          /* fail silently */
        }
      }),
    )
  }
  return result
}

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
        dateFrom: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        dateTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
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
        .limit(200)

      if (input.status !== 'all') {
        query = query.eq('status', input.status)
      }
      if (input.dateFrom) query = query.gte('applies_to_date', input.dateFrom)
      if (input.dateTo) query = query.lte('applies_to_date', input.dateTo)

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
        channel: 'in_app' as const,
        title: `Solicitud de corrección ${statusText}`,
        body: input.review_note ?? `Tu solicitud del ${edit.applies_to_date} fue ${statusText}.`,
        sent_by: ctx.user!.sub,
      })
      broadcastNotification(edit.user_id)

      return { ok: true }
    }),

  bulkReviewActivityEdits: managerProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(100),
        status: z.enum(['approved', 'rejected']),
        review_note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: edits, error: fetchError } = await ctx.db
        .from('activity_edits')
        .select('id, user_id, applies_to_date')
        .in('id', input.ids)
        .eq('tenant_id', ctx.user!.tid)
        .eq('status', 'pending')

      if (fetchError)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: fetchError.message })
      if (!edits || edits.length === 0)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No se encontraron solicitudes pendientes',
        })

      const validIds = edits.map((e) => e.id)

      const { error } = await ctx.db
        .from('activity_edits')
        .update({
          status: input.status,
          review_note: input.review_note ?? null,
          reviewed_by: ctx.user!.sub,
          reviewed_at: new Date().toISOString(),
        })
        .in('id', validIds)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const statusText = input.status === 'approved' ? 'aprobada' : 'rechazada'
      await ctx.db.from('notifications').insert(
        edits.map((e) => ({
          tenant_id: ctx.user!.tid,
          user_id: e.user_id,
          channel: 'in_app' as const,
          sent_by: ctx.user!.sub,
          title: `Solicitud de corrección ${statusText}`,
          body:
            input.review_note ??
            `Tu solicitud del ${String(e.applies_to_date ?? '')} fue ${statusText}.`,
        })),
      )

      const uniqueUserIds = [...new Set(edits.map((e) => e.user_id))]
      broadcastNotificationToMany(uniqueUserIds)

      return { ok: true, count: validIds.length }
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

  // ─── Geolocalización ─────────────────────────────────────────────────────────

  getTeamGeoLocations: managerProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

    const { data: sessions, error } = await ctx.db
      .from('work_sessions')
      .select('user_id, ip_inet, started_at')
      .eq('tenant_id', ctx.user!.tid)
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    const latestPerUser = new Map<string, { user_id: string; ip: string | null }>()
    for (const s of sessions ?? []) {
      if (!latestPerUser.has(s.user_id)) {
        latestPerUser.set(s.user_id, {
          user_id: s.user_id,
          ip: typeof s.ip_inet === 'string' ? s.ip_inet : null,
        })
      }
    }

    const userIds = [...latestPerUser.keys()]
    if (userIds.length === 0) return []

    const { data: users } = await ctx.db
      .from('users')
      .select('id, full_name, geo_city, geo_country, geo_lat, geo_lon')
      .in('id', userIds)
      .eq('tenant_id', ctx.user!.tid)

    const usersMap = new Map((users ?? []).map((u) => [u.id, u]))

    const publicIPs = [...latestPerUser.values()]
      .filter((u) => u.ip && !isPrivateIP(u.ip))
      .map((u) => u.ip!)

    const geoMap =
      publicIPs.length > 0 ? await geolocateBatch(publicIPs) : new Map<string, GeoInfo>()

    return [...latestPerUser.values()].map((u) => {
      const user = usersMap.get(u.user_id)
      // Manual location set by admin/manager takes priority
      if (user?.geo_lat != null && user?.geo_lon != null) {
        return {
          user_id: u.user_id,
          full_name: user.full_name ?? 'Usuario',
          country: user.geo_country ?? null,
          country_code: null as string | null,
          city: user.geo_city ?? null,
          lat: user.geo_lat,
          lon: user.geo_lon,
        }
      }
      // Fall back to IP-based geolocation
      const geo = u.ip ? geoMap.get(u.ip) : undefined
      return {
        user_id: u.user_id,
        full_name: user?.full_name ?? 'Usuario',
        country: geo?.country ?? null,
        country_code: geo?.countryCode ?? null,
        city: geo?.city ?? null,
        lat: geo?.lat ?? null,
        lon: geo?.lon ?? null,
      }
    })
  }),

  // ─── Asignar ubicación manual ─────────────────────────────────────────────

  setUserLocation: managerProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        city: z.string().max(150).optional(),
        country: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let lat: number | null = null
      let lon: number | null = null

      if (input.city || input.country) {
        const q = encodeURIComponent([input.city, input.country].filter(Boolean).join(', '))
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
            {
              headers: { 'User-Agent': 'BCWork/1.0 (soporte@bcwork.app)' },
              signal: AbortSignal.timeout(6000),
            },
          )
          const data = (await res.json()) as Array<{ lat: string; lon: string }>
          if (data[0]) {
            lat = parseFloat(data[0].lat)
            lon = parseFloat(data[0].lon)
          }
        } catch {
          /* fail silently — user can retry */
        }
      }

      const { error } = await ctx.db
        .from('users')
        .update({
          geo_city: input.city ?? null,
          geo_country: input.country ?? null,
          geo_lat: lat,
          geo_lon: lon,
        })
        .eq('id', input.userId)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true, lat, lon, resolved: lat !== null }
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

  // ─── Gestión de ausencias ─────────────────────────────────────────────────

  getTimeOffRequests: managerProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('time_off')
        .select(
          'id, type, starts_on, ends_on, status, notes, created_at, user_id, users!time_off_user_id_fkey(full_name, email)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
        .limit(100)

      if (input.status !== 'all') q = q.eq('status', input.status)

      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return (data ?? []).map((r) => ({
        id: r.id,
        type: r.type,
        starts_on: r.starts_on,
        ends_on: r.ends_on,
        status: r.status,
        notes: r.notes,
        created_at: r.created_at,
        user_id: r.user_id,
        user_name: (r.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
        user_email: (r.users as unknown as { email: string } | null)?.email ?? null,
      }))
    }),

  // ─── Tiempo manual ────────────────────────────────────────────────────────

  getManualTimeEntries: managerProcedure
    .input(
      z.object({ status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending') }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('manual_time_entries')
        .select(
          'id, entry_date, started_at, ended_at, duration_minutes, entry_type, description, status, review_note, created_at, user_id, users!manual_time_entries_user_id_fkey(full_name, email)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('entry_date', { ascending: false })
        .limit(100)

      if (input.status !== 'all') q = q.eq('status', input.status)

      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return (data ?? []).map((r) => ({
        id: r.id,
        entry_date: r.entry_date,
        started_at: r.started_at,
        ended_at: r.ended_at,
        duration_minutes: r.duration_minutes,
        entry_type: r.entry_type,
        description: r.description,
        status: r.status,
        review_note: r.review_note,
        created_at: r.created_at,
        user_id: r.user_id,
        user_name: (r.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
        user_email: (r.users as unknown as { email: string } | null)?.email ?? null,
      }))
    }),

  reviewManualTimeEntry: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['approved', 'rejected']),
        review_note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: existing, error: fetchErr } = await ctx.db
        .from('manual_time_entries')
        .select('user_id, entry_date, entry_type, status')
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .single()

      if (fetchErr || !existing)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Entrada no encontrada' })
      if (existing.status !== 'pending')
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta entrada ya fue revisada' })

      const { error } = await ctx.db
        .from('manual_time_entries')
        .update({
          status: input.status,
          approved_by: ctx.user!.sub,
          review_note: input.review_note ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const label = input.status === 'approved' ? 'aprobada' : 'rechazada'
      await ctx.db.from('notifications').insert({
        tenant_id: ctx.user!.tid,
        user_id: existing.user_id,
        channel: 'in_app',
        title: `Entrada de tiempo manual ${label}`,
        body: `Tu registro de ${existing.entry_type} del ${existing.entry_date} fue ${label}.`,
        sent_by: ctx.user!.sub,
      })
      broadcastNotificationToMany([existing.user_id])

      return { ok: true }
    }),

  reviewTimeOff: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['approved', 'rejected']),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: existing, error: fetchErr } = await ctx.db
        .from('time_off')
        .select('user_id, type, starts_on, ends_on, status')
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .single()

      if (fetchErr || !existing)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitud no encontrada' })

      if (existing.status !== 'pending')
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta solicitud ya fue procesada' })

      const { error } = await ctx.db
        .from('time_off')
        .update({
          status: input.status,
          approved_by: ctx.user!.sub,
          notes: input.notes ?? existing.ends_on,
        })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Notificar al empleado
      const label = input.status === 'approved' ? 'aprobada' : 'rechazada'
      await ctx.db.from('notifications').insert({
        tenant_id: ctx.user!.tid,
        user_id: existing.user_id,
        channel: 'in_app',
        title: `Solicitud de ausencia ${label}`,
        body: `Tu solicitud de ${existing.type} del ${existing.starts_on} al ${existing.ends_on} fue ${label}.`,
        sent_by: ctx.user!.sub,
      })
      broadcastNotificationToMany([existing.user_id])

      return { ok: true }
    }),
})
