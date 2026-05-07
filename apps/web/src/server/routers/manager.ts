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

  // ─── Horas extra ──────────────────────────────────────────────────────────

  getOvertimeRequests: managerProcedure
    .input(
      z.object({ status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending') }),
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
      if (input.status !== 'all') q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).map((r) => ({
        id: r.id,
        date: r.date,
        overtime_seconds: r.overtime_seconds,
        type: r.type,
        reason: r.reason,
        status: r.status,
        manager_note: r.manager_note,
        created_at: r.created_at,
        employee_id: r.employee_id,
        user_name: (r.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
        user_email: (r.users as unknown as { email: string } | null)?.email ?? null,
        department:
          (r.users as unknown as { department: string | null } | null)?.department ?? null,
      }))
    }),

  reviewOvertimeRequest: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['approved', 'rejected']),
        manager_note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: existing, error: fetchErr } = await ctx.db
        .from('overtime_requests')
        .select('employee_id, date, type, status')
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .single()
      if (fetchErr || !existing)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitud no encontrada' })
      if (existing.status !== 'pending')
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta solicitud ya fue procesada' })
      const { error } = await ctx.db
        .from('overtime_requests')
        .update({ status: input.status, manager_note: input.manager_note ?? null })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      const label = input.status === 'approved' ? 'aprobada' : 'rechazada'
      await ctx.db.from('notifications').insert({
        tenant_id: ctx.user!.tid,
        user_id: existing.employee_id,
        channel: 'in_app',
        title: `Solicitud de horas extra ${label}`,
        body: input.manager_note ?? `Tu solicitud del ${existing.date} fue ${label}.`,
        sent_by: ctx.user!.sub,
      })
      broadcastNotificationToMany([existing.employee_id])
      return { ok: true }
    }),

  getPendingOvertimeCount: managerProcedure.query(async ({ ctx }) => {
    const { count, error } = await ctx.db
      .from('overtime_requests')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.user!.tid)
      .eq('status', 'pending')
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { count: count ?? 0 }
  }),

  // ─── Objetivos del equipo ─────────────────────────────────────────────────

  getTeamGoals: managerProcedure
    .input(
      z.object({
        employee_id: z.string().uuid().optional(),
        status: z.enum(['active', 'completed', 'cancelled', 'all']).default('active'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('employee_goals')
        .select(
          'id, title, description, target_value, current_value, unit, due_date, status, created_at, employee_id, users!employee_goals_employee_id_fkey(full_name, email)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
      if (input.status !== 'all') q = q.eq('status', input.status)
      if (input.employee_id) q = q.eq('employee_id', input.employee_id)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        target_value: g.target_value,
        current_value: g.current_value,
        unit: g.unit,
        due_date: g.due_date,
        status: g.status,
        created_at: g.created_at,
        employee_id: g.employee_id,
        user_name: (g.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
        user_email: (g.users as unknown as { email: string } | null)?.email ?? null,
      }))
    }),

  createTeamGoal: managerProcedure
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
      const { error } = await ctx.db.from('employee_goals').insert({
        tenant_id: ctx.user!.tid,
        employee_id: input.employee_id,
        title: input.title,
        description: input.description ?? null,
        target_value: input.target_value ?? null,
        current_value: 0,
        unit: input.unit ?? null,
        due_date: input.due_date ?? null,
        status: 'active',
        created_by: ctx.user!.sub,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      await ctx.db.from('notifications').insert({
        tenant_id: ctx.user!.tid,
        user_id: input.employee_id,
        channel: 'in_app',
        title: 'Nuevo objetivo asignado',
        body: `Tu manager te asignó un nuevo objetivo: "${input.title}"`,
        sent_by: ctx.user!.sub,
      })
      broadcastNotificationToMany([input.employee_id])
      return { ok: true }
    }),

  updateTeamGoal: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        current_value: z.number().optional(),
        status: z.enum(['active', 'completed', 'cancelled']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = {}
      if (input.current_value !== undefined) patch.current_value = input.current_value
      if (input.status) patch.status = input.status
      const { error } = await ctx.db
        .from('employee_goals')
        .update(patch as any)
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Reuniones 1:1 ───────────────────────────────────────────────────────

  getTeam1on1s: managerProcedure
    .input(z.object({ upcoming: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('one_on_ones')
        .select(
          'id, scheduled_at, duration_minutes, agenda, notes, status, employee_id, manager_id, users!one_on_ones_employee_id_fkey(full_name, email)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('scheduled_at', { ascending: true })
        .limit(50)
      if (input.upcoming) q = q.gte('scheduled_at', new Date().toISOString())
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).map((r) => ({
        id: r.id,
        scheduled_at: r.scheduled_at,
        duration_minutes: r.duration_minutes,
        agenda: r.agenda,
        notes: r.notes,
        status: r.status,
        employee_id: r.employee_id,
        manager_id: r.manager_id,
        user_name: (r.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
        user_email: (r.users as unknown as { email: string } | null)?.email ?? null,
      }))
    }),

  createTeam1on1: managerProcedure
    .input(
      z.object({
        employee_id: z.string().uuid(),
        scheduled_at: z.string(),
        duration_minutes: z.number().int().min(15).max(180).default(30),
        agenda: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from('one_on_ones').insert({
        tenant_id: ctx.user!.tid,
        employee_id: input.employee_id,
        manager_id: ctx.user!.sub,
        scheduled_at: input.scheduled_at,
        duration_minutes: input.duration_minutes,
        agenda: input.agenda ?? null,
        status: 'scheduled',
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      await ctx.db.from('notifications').insert({
        tenant_id: ctx.user!.tid,
        user_id: input.employee_id,
        channel: 'in_app',
        title: 'Nueva reunión 1:1 agendada',
        body: `Tu manager agendó una reunión 1:1 para ${new Date(input.scheduled_at).toLocaleDateString('es-CO')}.`,
        sent_by: ctx.user!.sub,
      })
      broadcastNotificationToMany([input.employee_id])
      return { ok: true }
    }),

  updateTeam1on1: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        notes: z.string().max(2000).optional(),
        status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
        agenda: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: Record<string, unknown> = {}
      if (input.notes !== undefined) patch.notes = input.notes
      if (input.status) patch.status = input.status
      if (input.agenda !== undefined) patch.agenda = input.agenda
      const { error } = await ctx.db
        .from('one_on_ones')
        .update(patch as any)
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Mensajes con el equipo ───────────────────────────────────────────────

  getTeamConversations: managerProcedure.query(async ({ ctx }) => {
    const userId = ctx.user!.sub
    const tenantId = ctx.user!.tid
    const { data, error } = await ctx.db
      .from('messages')
      .select('id, from_user_id, to_user_id, body, read_at, created_at')
      .eq('tenant_id', tenantId)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    const msgs = data ?? []
    const peerIds = [
      ...new Set(msgs.map((m) => (m.from_user_id === userId ? m.to_user_id : m.from_user_id))),
    ]
    if (peerIds.length === 0) return []

    const { data: peers } = await ctx.db
      .from('users')
      .select('id, full_name, email')
      .in('id', peerIds)
      .eq('tenant_id', tenantId)
    const peerMap = new Map((peers ?? []).map((p) => [p.id, p]))

    return peerIds
      .map((peerId) => {
        const conv = msgs.filter((m) => m.from_user_id === peerId || m.to_user_id === peerId)
        const last = conv[0]
        const unread = conv.filter((m) => m.to_user_id === userId && !m.read_at).length
        const peer = peerMap.get(peerId)
        return {
          peer_id: peerId,
          peer_name: peer?.full_name ?? peer?.email ?? peerId,
          peer_email: peer?.email ?? '',
          last_message: last?.body ?? '',
          last_at: last?.created_at ?? '',
          unread_count: unread,
        }
      })
      .sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
  }),

  getConversation: managerProcedure
    .input(
      z.object({ peer_id: z.string().uuid(), limit: z.number().int().min(1).max(100).default(50) }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.sub
      const { data, error } = await ctx.db
        .from('messages')
        .select('id, from_user_id, to_user_id, body, read_at, created_at')
        .eq('tenant_id', ctx.user!.tid)
        .or(
          `and(from_user_id.eq.${userId},to_user_id.eq.${input.peer_id}),and(from_user_id.eq.${input.peer_id},to_user_id.eq.${userId})`,
        )
        .order('created_at', { ascending: true })
        .limit(input.limit)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  sendMessage: managerProcedure
    .input(z.object({ to_user_id: z.string().uuid(), body: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from('messages').insert({
        tenant_id: ctx.user!.tid,
        from_user_id: ctx.user!.sub,
        to_user_id: input.to_user_id,
        body: input.body,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      broadcastNotificationToMany([input.to_user_id])
      return { ok: true }
    }),

  markConversationRead: managerProcedure
    .input(z.object({ peer_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('tenant_id', ctx.user!.tid)
        .eq('from_user_id', input.peer_id)
        .eq('to_user_id', ctx.user!.sub)
        .is('read_at', null)
      return { ok: true }
    }),

  getUnreadMessageCount: managerProcedure.query(async ({ ctx }) => {
    const { count, error } = await ctx.db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.user!.tid)
      .eq('to_user_id', ctx.user!.sub)
      .is('read_at', null)
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { count: count ?? 0 }
  }),

  // ─── Timesheet consolidado ────────────────────────────────────────────────

  getTeamTimesheet: managerProcedure
    .input(
      z.object({
        teamId: z.string().uuid().optional(),
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
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

      let q = ctx.db
        .from('daily_user_metrics')
        .select(
          'user_id, metric_date, active_seconds, productive_seconds, overtime_seconds, productivity_ratio',
        )
        .eq('tenant_id', tenantId)
        .gte('metric_date', input.dateFrom)
        .lte('metric_date', input.dateTo)
        .order('metric_date', { ascending: false })

      if (memberIds) q = q.in('user_id', memberIds)

      const { data: metrics, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const userIds = [...new Set((metrics ?? []).map((m) => m.user_id))]
      const { data: users } = await ctx.db
        .from('users')
        .select('id, full_name, email, department')
        .in('id', userIds)
        .eq('tenant_id', tenantId)
      const userMap = new Map((users ?? []).map((u) => [u.id, u]))

      return (metrics ?? []).map((m) => ({
        user_id: m.user_id,
        full_name: userMap.get(m.user_id)?.full_name ?? null,
        email: userMap.get(m.user_id)?.email ?? '',
        department: userMap.get(m.user_id)?.department ?? null,
        metric_date: m.metric_date,
        active_seconds: m.active_seconds ?? 0,
        productive_seconds: m.productive_seconds ?? 0,
        overtime_seconds: m.overtime_seconds ?? 0,
        productivity_ratio: Number(m.productivity_ratio ?? 0),
      }))
    }),

  // ─── Gastos del equipo ────────────────────────────────────────────────────

  getTeamExpenses: managerProcedure
    .input(
      z.object({ status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending') }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('expenses' as any)
        .select(
          'id, amount, currency, category, description, receipt_url, status, manager_note, expense_date, created_at, user_id, users!expenses_user_id_fkey(full_name, email)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
        .limit(100)
      if (input.status !== 'all') q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).map((e: any) => ({
        id: e.id,
        amount: e.amount,
        currency: e.currency ?? 'COP',
        category: e.category,
        description: e.description,
        receipt_url: e.receipt_url,
        status: e.status,
        manager_note: e.manager_note,
        expense_date: e.expense_date,
        created_at: e.created_at,
        user_id: e.user_id,
        user_name: (e.users as any)?.full_name ?? null,
        user_email: (e.users as any)?.email ?? null,
      }))
    }),

  reviewExpense: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['approved', 'rejected']),
        manager_note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: existing, error: fetchErr } = await ctx.db
        .from('expenses' as any)
        .select('user_id, amount, currency, status')
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .single()
      if (fetchErr || !existing)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gasto no encontrado' })
      const { error } = await ctx.db
        .from('expenses' as any)
        .update({ status: input.status, manager_note: input.manager_note ?? null } as any)
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      const label = input.status === 'approved' ? 'aprobado' : 'rechazado'
      await ctx.db.from('notifications').insert({
        tenant_id: ctx.user!.tid,
        user_id: (existing as any).user_id,
        channel: 'in_app',
        title: `Gasto ${label}`,
        body: input.manager_note ?? `Tu gasto fue ${label}.`,
        sent_by: ctx.user!.sub,
      })
      broadcastNotificationToMany([(existing as any).user_id])
      return { ok: true }
    }),

  getPendingExpensesCount: managerProcedure.query(async ({ ctx }) => {
    const { count, error } = await ctx.db
      .from('expenses' as any)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.user!.tid)
      .eq('status', 'pending')
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { count: count ?? 0 }
  }),

  // ─── Reportes del equipo ─────────────────────────────────────────────────

  getTeamReportData: managerProcedure
    .input(
      z.object({
        teamId: z.string().uuid().optional(),
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
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
        if (memberIds.length === 0)
          return { users: [], period: { dateFrom: input.dateFrom, dateTo: input.dateTo } }
      }

      let q = ctx.db
        .from('daily_user_metrics')
        .select(
          'user_id, metric_date, active_seconds, productive_seconds, overtime_seconds, productivity_ratio, focus_score',
        )
        .eq('tenant_id', tenantId)
        .gte('metric_date', input.dateFrom)
        .lte('metric_date', input.dateTo)

      if (memberIds) q = q.in('user_id', memberIds)
      const { data: metrics, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const userIds = [...new Set((metrics ?? []).map((m) => m.user_id))]
      const { data: users } = await ctx.db
        .from('users')
        .select('id, full_name, email, department, position')
        .in('id', userIds)
        .eq('tenant_id', tenantId)
      const userMap = new Map((users ?? []).map((u) => [u.id, u]))

      const byUser = new Map<
        string,
        { active: number; productive: number; overtime: number; days: number; ratios: number[] }
      >()
      for (const m of metrics ?? []) {
        const u = byUser.get(m.user_id) ?? {
          active: 0,
          productive: 0,
          overtime: 0,
          days: 0,
          ratios: [],
        }
        u.active += m.active_seconds ?? 0
        u.productive += m.productive_seconds ?? 0
        u.overtime += m.overtime_seconds ?? 0
        u.days++
        if (m.productivity_ratio != null) u.ratios.push(Number(m.productivity_ratio))
        byUser.set(m.user_id, u)
      }

      const result = Array.from(byUser.entries())
        .map(([uid, v]) => {
          const info = userMap.get(uid)
          const avgRatio =
            v.ratios.length > 0 ? v.ratios.reduce((a, b) => a + b, 0) / v.ratios.length : 0
          return {
            user_id: uid,
            full_name: info?.full_name ?? null,
            email: info?.email ?? '',
            department: info?.department ?? null,
            position: info?.position ?? null,
            active_seconds: v.active,
            productive_seconds: v.productive,
            overtime_seconds: v.overtime,
            days_active: v.days,
            productivity_ratio: avgRatio,
          }
        })
        .sort((a, b) => b.active_seconds - a.active_seconds)

      return { users: result, period: { dateFrom: input.dateFrom, dateTo: input.dateTo } }
    }),

  // ─── Ausencias / Vacaciones ───────────────────────────────────────────────

  getLeaveRequests: managerProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      let q = ctx.db
        .from('absence_requests')
        .select('*, users!absence_requests_employee_id_fkey(full_name, email, department)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      if (input.status !== 'all') q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).map((r) => ({
        ...r,
        full_name: (r.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
        email: (r.users as unknown as { email: string } | null)?.email ?? '',
        department:
          (r.users as unknown as { department: string | null } | null)?.department ?? null,
      }))
    }),

  reviewLeaveRequest: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['approved', 'rejected']),
        manager_note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db
        .from('absence_requests')
        .update({
          status: input.status,
          manager_note: input.manager_note ?? null,
          reviewed_by: ctx.user!.sub,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getPendingLeaveCount: managerProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid
    const { count } = await ctx.db
      .from('absence_requests')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
    return count ?? 0
  }),

  // ─── Tendencias ───────────────────────────────────────────────────────────

  getTeamTrends: managerProcedure
    .input(
      z.object({
        teamId: z.string().uuid().optional(),
        days: z.number().int().min(7).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const dateFrom = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)

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

      let q = ctx.db
        .from('daily_user_metrics')
        .select('metric_date, user_id, active_seconds, productivity_ratio, overtime_seconds')
        .eq('tenant_id', tenantId)
        .gte('metric_date', dateFrom)
        .order('metric_date')

      if (memberIds) q = q.in('user_id', memberIds)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const byDate = new Map<
        string,
        { active: number[]; ratios: number[]; overtime: number; users: number }
      >()
      for (const m of data ?? []) {
        const d = byDate.get(m.metric_date) ?? { active: [], ratios: [], overtime: 0, users: 0 }
        d.active.push(m.active_seconds ?? 0)
        if (m.productivity_ratio != null) d.ratios.push(Number(m.productivity_ratio))
        d.overtime += m.overtime_seconds ?? 0
        d.users++
        byDate.set(m.metric_date, d)
      }

      return Array.from(byDate.entries()).map(([date, v]) => ({
        date,
        avg_active_seconds:
          v.active.length > 0
            ? Math.round(v.active.reduce((a, b) => a + b, 0) / v.active.length)
            : 0,
        avg_productivity_ratio:
          v.ratios.length > 0 ? v.ratios.reduce((a, b) => a + b, 0) / v.ratios.length : 0,
        total_overtime_seconds: v.overtime,
        active_users: v.users,
      }))
    }),

  // ─── Evaluaciones de desempeño ────────────────────────────────────────────

  getTeamReviews: managerProcedure
    .input(z.object({ status: z.enum(['pending', 'completed', 'all']).default('all') }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      let q = ctx.db
        .from('performance_reviews')
        .select(
          '*, reviewee:users!performance_reviews_reviewee_id_fkey(full_name, email, department), reviewer:users!performance_reviews_reviewer_id_fkey(full_name, email)',
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      if (input.status !== 'all') q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).map((r) => ({
        ...r,
        reviewee_name:
          (r.reviewee as unknown as { full_name: string | null } | null)?.full_name ?? null,
        reviewee_email: (r.reviewee as unknown as { email: string } | null)?.email ?? '',
        reviewee_department:
          (r.reviewee as unknown as { department: string | null } | null)?.department ?? null,
        reviewer_name:
          (r.reviewer as unknown as { full_name: string | null } | null)?.full_name ?? null,
      }))
    }),

  createReview: managerProcedure
    .input(
      z.object({
        reviewee_id: z.string().uuid(),
        review_type: z.enum(['quarterly', 'annual', 'probation', 'pip']),
        period_label: z.string().min(1),
        due_date: z.string().optional(),
        questions: z
          .array(
            z.object({
              id: z.string(),
              text: z.string(),
              type: z.enum(['rating', 'text']),
            }),
          )
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { data, error } = await ctx.db
        .from('performance_reviews')
        .insert({
          tenant_id: tenantId,
          reviewee_id: input.reviewee_id,
          reviewer_id: ctx.user!.sub,
          review_type: input.review_type,
          period_label: input.period_label,
          due_date: input.due_date ?? null,
          questions: input.questions,
          status: 'pending',
          created_by: ctx.user!.sub,
        } as any)
        .select('id')
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  submitReview: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        answers: z.record(z.string(), z.unknown()),
        overall_rating: z.number().int().min(1).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db
        .from('performance_reviews')
        .update({
          answers: input.answers,
          overall_rating: input.overall_rating,
          status: 'completed',
          submitted_at: new Date().toISOString(),
        } as any)
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Calendario del equipo ────────────────────────────────────────────────

  getTeamCalendar: managerProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateFrom = `${input.year}-${pad(input.month)}-01`
      const dateTo = new Date(input.year, input.month, 0).toISOString().slice(0, 10)

      const [absencesRes, oneOnOnesRes, eventsRes] = await Promise.all([
        ctx.db
          .from('absence_requests')
          .select(
            'id, employee_id, type, start_date, end_date, days_count, status, users!absence_requests_employee_id_fkey(full_name, email)',
          )
          .eq('tenant_id', tenantId)
          .in('status', ['approved', 'pending'])
          .lte('start_date', dateTo)
          .gte('end_date', dateFrom),
        ctx.db
          .from('one_on_ones')
          .select(
            'id, employee_id, scheduled_at, duration_minutes, users!one_on_ones_employee_id_fkey(full_name, email)',
          )
          .eq('tenant_id', tenantId)
          .eq('status', 'scheduled')
          .gte('scheduled_at', `${dateFrom}T00:00:00`)
          .lte('scheduled_at', `${dateTo}T23:59:59`),
        ctx.db
          .from('company_events')
          .select('id, title, event_date, event_type')
          .eq('tenant_id', tenantId)
          .gte('event_date', dateFrom)
          .lte('event_date', dateTo),
      ])

      return {
        absences: (absencesRes.data ?? []).map((a) => ({
          id: a.id,
          employee_id: a.employee_id,
          full_name: (a.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
          email: (a.users as unknown as { email: string } | null)?.email ?? '',
          type: a.type,
          start_date: a.start_date,
          end_date: a.end_date,
          days_count: a.days_count,
          status: a.status,
        })),
        one_on_ones: (oneOnOnesRes.data ?? []).map((o) => ({
          id: o.id,
          employee_id: o.employee_id,
          full_name: (o.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
          scheduled_at: o.scheduled_at,
          duration_minutes: o.duration_minutes,
        })),
        events: (eventsRes.data ?? []) as Array<{
          id: string
          title: string
          event_date: string
          event_type: string
        }>,
      }
    }),

  // ─── Alertas configurables ────────────────────────────────────────────────

  getAlertRules: managerProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user!.tid
    const { data, error } = await ctx.db
      .from('alert_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createAlertRule: managerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        rule_type: z.string().min(1),
        threshold_value: z.number(),
        consecutive_days: z.number().int().min(1).default(1),
        scope: z.enum(['all', 'team', 'user']).default('all'),
        scope_id: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { data, error } = await ctx.db
        .from('alert_rules')
        .insert({ tenant_id: tenantId, ...input, created_by: ctx.user!.sub } as any)
        .select('id')
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  toggleAlertRule: managerProcedure
    .input(z.object({ id: z.string().uuid(), is_active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db
        .from('alert_rules')
        .update({ is_active: input.is_active })
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteAlertRule: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db
        .from('alert_rules')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Reconocimientos / Kudos ──────────────────────────────────────────────

  getTeamKudos: managerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { data, error } = await ctx.db
        .from('kudos')
        .select(
          '*, from_user:users!kudos_from_user_id_fkey(full_name, email), to_user:users!kudos_to_user_id_fkey(full_name, email)',
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(input.limit)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).map((k) => ({
        id: k.id,
        from_user_id: k.from_user_id,
        to_user_id: k.to_user_id,
        from_name:
          (k.from_user as unknown as { full_name: string | null; email: string } | null)
            ?.full_name ??
          (k.from_user as unknown as { email: string } | null)?.email ??
          '',
        to_name:
          (k.to_user as unknown as { full_name: string | null; email: string } | null)?.full_name ??
          (k.to_user as unknown as { email: string } | null)?.email ??
          '',
        message: k.message,
        value: k.value,
        created_at: k.created_at,
      }))
    }),

  sendKudo: managerProcedure
    .input(
      z.object({
        to_user_id: z.string().uuid(),
        message: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db.from('kudos').insert({
        tenant_id: tenantId,
        from_user_id: ctx.user!.sub,
        to_user_id: input.to_user_id,
        message: input.message,
        value: input.value,
      } as any)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Encuestas de pulso ───────────────────────────────────────────────────

  getTeamPulseSurveys: managerProcedure
    .input(z.object({ status: z.enum(['draft', 'active', 'closed', 'all']).default('all') }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      let q = ctx.db
        .from('pulse_surveys')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      if (input.status !== 'all') q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const surveyIds = (data ?? []).map((s) => s.id)
      let responseCounts: Record<string, number> = {}
      if (surveyIds.length > 0) {
        const { data: counts } = await ctx.db
          .from('pulse_responses')
          .select('survey_id')
          .in('survey_id', surveyIds)
          .eq('tenant_id', tenantId)
        for (const r of counts ?? []) {
          responseCounts[r.survey_id] = (responseCounts[r.survey_id] ?? 0) + 1
        }
      }

      return (data ?? []).map((s) => ({ ...s, response_count: responseCounts[s.id] ?? 0 }))
    }),

  createPulseSurvey: managerProcedure
    .input(
      z.object({
        title: z.string().min(1),
        questions: z.array(
          z.object({
            id: z.string(),
            text: z.string(),
            type: z.enum(['rating', 'text', 'yesno']),
          }),
        ),
        starts_at: z.string().optional(),
        ends_at: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { data, error } = await ctx.db
        .from('pulse_surveys')
        .insert({
          tenant_id: tenantId,
          created_by: ctx.user!.sub,
          title: input.title,
          questions: input.questions,
          status: 'draft',
          starts_at: input.starts_at ?? null,
          ends_at: input.ends_at ?? null,
        } as any)
        .select('id')
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  publishPulseSurvey: managerProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(['active', 'closed']) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db
        .from('pulse_surveys')
        .update({ status: input.status } as any)
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getPulseSurveyResults: managerProcedure
    .input(z.object({ surveyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { data: survey } = await ctx.db
        .from('pulse_surveys')
        .select('*')
        .eq('id', input.surveyId)
        .eq('tenant_id', tenantId)
        .single()

      const { data: responses } = await ctx.db
        .from('pulse_responses')
        .select('*, users!pulse_responses_user_id_fkey(full_name, email)')
        .eq('survey_id', input.surveyId)
        .eq('tenant_id', tenantId)

      const questions = ((survey as any)?.questions ?? []) as Array<{
        id: string
        text: string
        type: string
      }>
      const allResponses = (responses ?? []) as any[]

      // Aggregate per question
      const aggregated = questions.map((q) => {
        const vals = allResponses
          .map((r) => {
            const ans = (r.answers as any[]).find((a: any) => a.id === q.id)
            return ans?.value
          })
          .filter((v) => v !== undefined && v !== null && v !== '')

        if (q.type === 'rating') {
          const nums = vals.map(Number).filter((n) => !isNaN(n))
          const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null
          const dist: Record<string, number> = {}
          for (const n of nums) dist[n] = (dist[n] ?? 0) + 1
          return { ...q, avg, distribution: dist, count: nums.length }
        }
        return { ...q, avg: null, distribution: {}, answers: vals, count: vals.length }
      })

      return {
        survey,
        response_count: allResponses.length,
        questions: aggregated,
      }
    }),

  // ─── Capacitaciones del equipo ────────────────────────────────────────────

  getTeamTrainingProgress: managerProcedure
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
      }

      const { data: courses } = await ctx.db
        .from('training_courses')
        .select('id, title, description, category, duration_minutes, is_required')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      let enrollQ = ctx.db
        .from('training_enrollments')
        .select(
          'course_id, employee_id, status, progress_pct, completed_at, users!training_enrollments_employee_id_fkey(full_name, email)',
        )
        .eq('tenant_id', tenantId)
      if (memberIds) enrollQ = enrollQ.in('employee_id', memberIds)
      const { data: enrollments } = await enrollQ

      type EnrollmentEntry = {
        course_id: string
        status: string
        progress_pct: number
        completed_at: string | null
      }
      const byEmployee = new Map<
        string,
        { full_name: string | null; email: string; enrollments: EnrollmentEntry[] }
      >()
      for (const e of enrollments ?? []) {
        const existing: {
          full_name: string | null
          email: string
          enrollments: EnrollmentEntry[]
        } = byEmployee.get(e.employee_id) ?? {
          full_name: (e.users as any)?.full_name ?? null,
          email: (e.users as any)?.email ?? '',
          enrollments: [] as EnrollmentEntry[],
        }
        existing.enrollments.push({
          course_id: e.course_id,
          status: e.status,
          progress_pct: e.progress_pct,
          completed_at: e.completed_at,
        })
        byEmployee.set(e.employee_id, existing)
      }

      return {
        courses: courses ?? [],
        employees: Array.from(byEmployee.entries()).map(([id, v]) => ({ id, ...v })),
      }
    }),

  enrollInCourse: managerProcedure
    .input(z.object({ employee_id: z.string().uuid(), course_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db.from('training_enrollments').upsert(
        {
          tenant_id: tenantId,
          course_id: input.course_id,
          employee_id: input.employee_id,
          status: 'enrolled',
          progress_pct: 0,
        } as any,
        { onConflict: 'tenant_id,course_id,employee_id' },
      )
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Comparativa de equipo ────────────────────────────────────────────────

  getTeamComparison: managerProcedure
    .input(
      z.object({
        teamId: z.string().uuid().optional(),
        days: z.number().int().min(7).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const dateFrom = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

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

      let q = ctx.db
        .from('daily_user_metrics')
        .select(
          'user_id, active_seconds, productive_seconds, overtime_seconds, productivity_ratio, focus_score',
        )
        .eq('tenant_id', tenantId)
        .gte('metric_date', dateFrom)
      if (memberIds) q = q.in('user_id', memberIds)
      const { data: metrics, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const byUser = new Map<
        string,
        {
          active: number
          productive: number
          overtime: number
          ratios: number[]
          focus: number[]
          days: number
        }
      >()
      for (const m of metrics ?? []) {
        const u = byUser.get(m.user_id) ?? {
          active: 0,
          productive: 0,
          overtime: 0,
          ratios: [],
          focus: [],
          days: 0,
        }
        u.active += m.active_seconds ?? 0
        u.productive += m.productive_seconds ?? 0
        u.overtime += m.overtime_seconds ?? 0
        if (m.productivity_ratio != null) u.ratios.push(Number(m.productivity_ratio))
        if (m.focus_score != null) u.focus.push(Number(m.focus_score))
        u.days++
        byUser.set(m.user_id, u)
      }

      const userIds = [...byUser.keys()]
      const { data: users } = await ctx.db
        .from('users')
        .select('id, full_name, email, department, position')
        .in('id', userIds)
        .eq('tenant_id', tenantId)
      const userMap = new Map((users ?? []).map((u) => [u.id, u]))

      return Array.from(byUser.entries())
        .map(([uid, v]) => {
          const info = userMap.get(uid)
          const avgProd =
            v.ratios.length > 0 ? v.ratios.reduce((a, b) => a + b, 0) / v.ratios.length : 0
          const avgFocus =
            v.focus.length > 0 ? v.focus.reduce((a, b) => a + b, 0) / v.focus.length : 0
          return {
            user_id: uid,
            full_name: info?.full_name ?? null,
            email: info?.email ?? '',
            department: info?.department ?? null,
            position: info?.position ?? null,
            days_active: v.days,
            total_active_seconds: v.active,
            avg_daily_active_seconds: v.days > 0 ? Math.round(v.active / v.days) : 0,
            total_overtime_seconds: v.overtime,
            avg_productivity_ratio: avgProd,
            avg_focus_score: avgFocus,
          }
        })
        .sort((a, b) => b.avg_productivity_ratio - a.avg_productivity_ratio)
    }),

  // ─── Feedback 360° ────────────────────────────────────────────────────────

  getTeamFeedback360: managerProcedure
    .input(z.object({ period_label: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb = ctx.db
        .from('feedback_360' as any)
        .select(
          '*, from_user:users!feedback_360_from_user_id_fkey(full_name, email), to_user:users!feedback_360_to_user_id_fkey(full_name, email)',
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = (await (input.period_label
        ? (qb as any).eq('period_label', input.period_label)
        : qb)) as any
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return ((data ?? []) as any[]).map((f: any) => ({
        ...f,
        from_name: f.from_user?.full_name ?? f.from_user?.email ?? '',
        to_name: f.to_user?.full_name ?? f.to_user?.email ?? '',
      }))
    }),

  sendFeedback360: managerProcedure
    .input(
      z.object({
        to_user_id: z.string().uuid(),
        relationship: z.enum(['peer', 'self', 'upward', 'manager']),
        period_label: z.string().min(1),
        ratings: z.record(z.string(), z.number()),
        message: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await (ctx.db as any).from('feedback_360').insert({
        tenant_id: tenantId,
        from_user_id: ctx.user!.sub,
        to_user_id: input.to_user_id,
        relationship: input.relationship,
        period_label: input.period_label,
        ratings: input.ratings,
        message: input.message ?? null,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Presupuesto de gastos ────────────────────────────────────────────────

  getTeamExpenseBudget: managerProcedure
    .input(z.object({ period_month: z.string(), teamId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid

      const { data: budgets } = (await (ctx.db as any)
        .from('team_expense_budgets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('period_month', input.period_month)) as {
        data: Array<{ budget_amount: number; category: string | null }> | null
      }

      const monthStart = `${input.period_month}-01`
      const monthEnd = new Date(
        Number(input.period_month.slice(0, 4)),
        Number(input.period_month.slice(5, 7)),
        0,
      )
        .toISOString()
        .slice(0, 10)

      let expQ = ctx.db
        .from('expenses')
        .select('amount, currency, category, status')
        .eq('tenant_id', tenantId)
        .gte('expense_date', monthStart)
        .lte('expense_date', monthEnd)
        .in('status', ['approved', 'pending'])

      if (input.teamId) {
        const { data: members } = await ctx.db
          .from('team_members')
          .select('user_id')
          .eq('team_id', input.teamId)
          .eq('tenant_id', tenantId)
        const memberIds = (members ?? []).map((m) => m.user_id)
        if (memberIds.length > 0) expQ = expQ.in('employee_id', memberIds)
      }

      const { data: expenses } = await expQ

      const totalBudget = (budgets ?? []).reduce((s, b) => s + Number(b.budget_amount), 0)
      const totalSpent = (expenses ?? [])
        .filter((e) => e.status === 'approved')
        .reduce((s, e) => s + Number(e.amount), 0)
      const totalPending = (expenses ?? [])
        .filter((e) => e.status === 'pending')
        .reduce((s, e) => s + Number(e.amount), 0)

      const byCategory = new Map<string, { spent: number; budget: number }>()
      for (const e of expenses ?? []) {
        const c = byCategory.get(e.category) ?? { spent: 0, budget: 0 }
        if (e.status === 'approved') c.spent += Number(e.amount)
        byCategory.set(e.category, c)
      }
      for (const b of budgets ?? []) {
        if (b.category) {
          const c = byCategory.get(b.category) ?? { spent: 0, budget: 0 }
          c.budget += Number(b.budget_amount)
          byCategory.set(b.category, c)
        }
      }

      return {
        period_month: input.period_month,
        total_budget: totalBudget,
        total_spent: totalSpent,
        total_pending: totalPending,
        remaining: totalBudget - totalSpent,
        pct_used: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : null,
        by_category: Array.from(byCategory.entries()).map(([cat, v]) => ({ category: cat, ...v })),
      }
    }),

  setExpenseBudget: managerProcedure
    .input(
      z.object({
        period_month: z.string(),
        budget_amount: z.number().min(0),
        currency: z.string().default('COP'),
        category: z.string().optional(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await (ctx.db as any).from('team_expense_budgets').upsert(
        {
          tenant_id: tenantId,
          team_id: input.teamId ?? null,
          period_month: input.period_month,
          budget_amount: input.budget_amount,
          currency: input.currency,
          category: input.category ?? null,
          created_by: ctx.user!.sub,
        },
        { onConflict: 'tenant_id,team_id,period_month,category' },
      )
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Matriz de competencias ───────────────────────────────────────────────

  getTeamSkills: managerProcedure
    .input(z.object({ teamId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { data: members } = await ctx.db
        .from('team_members')
        .select('user_id, users!inner(id, full_name, email, department, position)')
        .eq('tenant_id', tenantId)
        .eq(input.teamId ? 'team_id' : 'tenant_id', input.teamId ?? tenantId)
      const userIds = (members ?? []).map((m) => m.user_id)
      const { data: skills } = (await (ctx.db as any)
        .from('employee_skills')
        .select('*')
        .eq('tenant_id', tenantId)
        .in(
          'user_id',
          userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'],
        )) as { data: any[] | null }
      return {
        members: (members ?? []).map((m) => ({ ...(m.users as any) })),
        skills: skills ?? [],
      }
    }),

  upsertSkill: managerProcedure
    .input(
      z.object({
        user_id: z.string().uuid(),
        skill_name: z.string().min(1),
        category: z.string().default('general'),
        level: z.number().int().min(1).max(5),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await (ctx.db as any).from('employee_skills').upsert(
        {
          tenant_id: tenantId,
          user_id: input.user_id,
          skill_name: input.skill_name,
          category: input.category,
          level: input.level,
          notes: input.notes ?? null,
          created_by: ctx.user!.sub,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,user_id,skill_name' },
      )
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteSkill: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await (ctx.db as any)
        .from('employee_skills')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Onboarding tracking ──────────────────────────────────────────────────

  getOnboardingProgress: managerProcedure
    .input(z.object({ teamId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      let empQ = (ctx.db as any)
        .from('users')
        .select('id, full_name, email, hire_date, position, department')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
      if (input.teamId) {
        const { data: members } = await ctx.db
          .from('team_members')
          .select('user_id')
          .eq('team_id', input.teamId)
          .eq('tenant_id', tenantId)
        const ids = (members ?? []).map((m) => m.user_id)
        if (ids.length > 0) empQ = empQ.in('id', ids)
      }
      const { data: employees } = (await empQ) as { data: any[] | null }
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 45)
      const newHires = (employees ?? []).filter((e: any) => {
        if (!e.hire_date) return false
        return new Date(e.hire_date) >= thirtyDaysAgo
      })
      const newHireIds = newHires.map((e: any) => e.id)
      const { data: tasks } = await ctx.db
        .from('onboarding_tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .in(
          'employee_id',
          newHireIds.length > 0 ? newHireIds : ['00000000-0000-0000-0000-000000000000'],
        )
      return {
        employees: employees ?? [],
        new_hires: newHires,
        tasks: tasks ?? [],
      }
    }),

  createOnboardingTask: managerProcedure
    .input(
      z.object({
        employee_id: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().default('general'),
        task_type: z.string().default('action'),
        due_date: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { data: maxOrder } = await ctx.db
        .from('onboarding_tasks')
        .select('order_index')
        .eq('employee_id', input.employee_id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()
      const { error } = await ctx.db.from('onboarding_tasks').insert({
        tenant_id: tenantId,
        employee_id: input.employee_id,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        task_type: input.task_type,
        due_date: input.due_date ?? null,
        order_index: ((maxOrder as any)?.order_index ?? 0) + 1,
        created_by: ctx.user!.sub,
      } as any)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  toggleOnboardingTask: managerProcedure
    .input(z.object({ id: z.string().uuid(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db
        .from('onboarding_tasks')
        .update({ completed_at: input.completed ? new Date().toISOString() : null } as any)
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Distribución de carga ────────────────────────────────────────────────

  getWorkloadDistribution: managerProcedure
    .input(z.object({ teamId: z.string().uuid().optional(), days: z.number().default(7) }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const since = new Date()
      since.setDate(since.getDate() - input.days)
      const sinceStr = since.toISOString().slice(0, 10)
      let memberIds: string[] = []
      if (input.teamId) {
        const { data: members } = await ctx.db
          .from('team_members')
          .select('user_id')
          .eq('team_id', input.teamId)
          .eq('tenant_id', tenantId)
        memberIds = (members ?? []).map((m) => m.user_id)
      } else {
        const { data: users } = await ctx.db
          .from('users')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
        memberIds = (users ?? []).map((u) => u.id)
      }
      const { data: metrics } = await ctx.db
        .from('daily_user_metrics')
        .select('user_id, active_seconds, productivity_ratio, metric_date')
        .eq('tenant_id', tenantId)
        .in('user_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
        .gte('metric_date', sinceStr)
      const { data: goals } = await ctx.db
        .from('employee_goals')
        .select('employee_id, status')
        .eq('tenant_id', tenantId)
        .in(
          'employee_id',
          memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'],
        )
        .eq('status', 'active')
      const { data: users } = await ctx.db
        .from('users')
        .select('id, full_name, email, department, position')
        .eq('tenant_id', tenantId)
        .in('id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
      const goalCountByUser = (goals ?? []).reduce((acc: Record<string, number>, g) => {
        acc[g.employee_id] = (acc[g.employee_id] ?? 0) + 1
        return acc
      }, {})
      const metricsByUser: Record<
        string,
        { total_seconds: number; days: number; prod_sum: number }
      > = {}
      for (const m of metrics ?? []) {
        if (!metricsByUser[m.user_id])
          metricsByUser[m.user_id] = { total_seconds: 0, days: 0, prod_sum: 0 }
        metricsByUser[m.user_id]!.total_seconds += m.active_seconds ?? 0
        metricsByUser[m.user_id]!.days += 1
        metricsByUser[m.user_id]!.prod_sum += m.productivity_ratio ?? 0
      }
      return (users ?? []).map((u) => {
        const m = metricsByUser[u.id]
        const avgDailyHours = m ? m.total_seconds / 3600 / m.days : 0
        const avgProd = m ? m.prod_sum / m.days : 0
        const activeGoals = goalCountByUser[u.id] ?? 0
        const load = avgDailyHours >= 9 ? 'high' : avgDailyHours >= 6 ? 'medium' : 'low'
        return {
          ...u,
          avg_daily_hours: Math.round(avgDailyHours * 10) / 10,
          avg_productivity: Math.round(avgProd * 100),
          active_goals: activeGoals,
          load_level: load,
          days_active: m?.days ?? 0,
        }
      })
    }),

  // ─── Plan de mejora de desempeño (PIP) ────────────────────────────────────

  getTeamPIPs: managerProcedure
    .input(z.object({ teamId: z.string().uuid().optional(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const qb = (ctx.db as any)
        .from('pip_plans')
        .select(
          '*, employee:users!pip_plans_employee_id_fkey(full_name, email, department, position)',
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      const { data, error } = (await (input.status ? qb.eq('status', input.status) : qb)) as {
        data: any[] | null
        error: any
      }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).map((p: any) => ({
        ...p,
        employee_name: p.employee?.full_name ?? p.employee?.email ?? '',
        employee_dept: p.employee?.department ?? '',
        employee_position: p.employee?.position ?? '',
      }))
    }),

  createPIP: managerProcedure
    .input(
      z.object({
        employee_id: z.string().uuid(),
        title: z.string().min(1),
        reason: z.string().optional(),
        goals: z.string().optional(),
        start_date: z.string(),
        end_date: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await (ctx.db as any).from('pip_plans').insert({
        tenant_id: tenantId,
        employee_id: input.employee_id,
        manager_id: ctx.user!.sub,
        title: input.title,
        reason: input.reason ?? null,
        goals: input.goals ?? null,
        start_date: input.start_date,
        end_date: input.end_date ?? null,
        status: 'draft',
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  updatePIPStatus: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['draft', 'active', 'completed', 'cancelled']),
        outcome_notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await (ctx.db as any)
        .from('pip_plans')
        .update({
          status: input.status,
          outcome_notes: input.outcome_notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Org chart ────────────────────────────────────────────────────────────

  getTeamOrgChart: managerProcedure
    .input(z.object({ teamId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { data: users } = await ctx.db
        .from('users')
        .select('id, full_name, email, department, position, manager_id, role, status')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'invited'])
      return users ?? []
    }),

  updateUserManager: managerProcedure
    .input(z.object({ user_id: z.string().uuid(), manager_id: z.string().uuid().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await ctx.db
        .from('users')
        .update({ manager_id: input.manager_id } as any)
        .eq('id', input.user_id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Compensación ─────────────────────────────────────────────────────────

  getCompensationRecords: managerProcedure
    .input(z.object({ teamId: z.string().uuid().optional(), userId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      let userIds: string[] = []
      if (input.userId) {
        userIds = [input.userId]
      } else if (input.teamId) {
        const { data: members } = await ctx.db
          .from('team_members')
          .select('user_id')
          .eq('team_id', input.teamId)
          .eq('tenant_id', tenantId)
        userIds = (members ?? []).map((m) => m.user_id)
      } else {
        const { data: users } = await ctx.db
          .from('users')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
        userIds = (users ?? []).map((u) => u.id)
      }
      const { data: records } = (await (ctx.db as any)
        .from('compensation_records')
        .select(
          '*, employee:users!compensation_records_user_id_fkey(full_name, email, department, position)',
        )
        .eq('tenant_id', tenantId)
        .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])
        .order('effective_date', { ascending: false })) as { data: any[] | null }
      return (records ?? []).map((r: any) => ({
        ...r,
        employee_name: r.employee?.full_name ?? r.employee?.email ?? '',
        employee_dept: r.employee?.department ?? '',
        employee_position: r.employee?.position ?? '',
      }))
    }),

  addCompensationRecord: managerProcedure
    .input(
      z.object({
        user_id: z.string().uuid(),
        effective_date: z.string(),
        salary_amount: z.number().min(0),
        currency: z.string().default('COP'),
        compensation_type: z.enum(['salary', 'bonus', 'raise', 'adjustment']),
        reason: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await (ctx.db as any).from('compensation_records').insert({
        tenant_id: tenantId,
        user_id: input.user_id,
        effective_date: input.effective_date,
        salary_amount: input.salary_amount,
        currency: input.currency,
        compensation_type: input.compensation_type,
        reason: input.reason ?? null,
        approved_by: ctx.user!.sub,
        notes: input.notes ?? null,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Aniversarios y hitos ─────────────────────────────────────────────────

  getTeamMilestones: managerProcedure
    .input(z.object({ teamId: z.string().uuid().optional(), months_ahead: z.number().default(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { data: users } = (await (ctx.db as any)
        .from('users')
        .select('id, full_name, email, department, position, hire_date, birthdate')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')) as { data: any[] | null }
      const today = new Date()
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + input.months_ahead)
      const milestones: Array<{
        user_id: string
        name: string
        type: string
        date: string
        years?: number
      }> = []
      for (const u of users ?? []) {
        const hireDate = u.hire_date
        const birthdate = u.birthdate
        const name = u.full_name ?? u.email
        if (hireDate) {
          const hire = new Date(hireDate)
          const thisYearAnniv = new Date(today.getFullYear(), hire.getMonth(), hire.getDate())
          const nextAnniv =
            thisYearAnniv < today
              ? new Date(today.getFullYear() + 1, hire.getMonth(), hire.getDate())
              : thisYearAnniv
          if (nextAnniv <= futureDate) {
            const years = nextAnniv.getFullYear() - hire.getFullYear()
            milestones.push({
              user_id: u.id,
              name,
              type: 'anniversary',
              date: nextAnniv.toISOString().slice(0, 10),
              years,
            })
          }
        }
        if (birthdate) {
          const bday = new Date(birthdate)
          const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
          const nextBday =
            thisYearBday < today
              ? new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate())
              : thisYearBday
          if (nextBday <= futureDate) {
            milestones.push({
              user_id: u.id,
              name,
              type: 'birthday',
              date: nextBday.toISOString().slice(0, 10),
            })
          }
        }
      }
      milestones.sort((a, b) => a.date.localeCompare(b.date))
      return { milestones, employees: users ?? [] }
    }),

  updateUserMilestoneData: managerProcedure
    .input(
      z.object({
        user_id: z.string().uuid(),
        hire_date: z.string().optional(),
        birthdate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const update: Record<string, string | null> = {}
      if (input.hire_date !== undefined) update.hire_date = input.hire_date || null
      if (input.birthdate !== undefined) update.birthdate = input.birthdate || null
      const { error } = await ctx.db
        .from('users')
        .update(update as any)
        .eq('id', input.user_id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Solicitudes de contratación ─────────────────────────────────────────

  getHiringRequests: managerProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      let q = (ctx.db as any)
        .from('hiring_requests')
        .select(
          '*, team:teams(name), requester:users!hiring_requests_requested_by_fkey(full_name, email)',
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      if (input.status) q = q.eq('status', input.status)
      const { data, error } = (await q) as { data: any[] | null; error: any }
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return (data ?? []).map((r: any) => ({
        ...r,
        team_name: r.team?.name ?? '',
        requester_name: r.requester?.full_name ?? r.requester?.email ?? '',
      }))
    }),

  createHiringRequest: managerProcedure
    .input(
      z.object({
        title: z.string().min(1),
        department: z.string().optional(),
        description: z.string().optional(),
        seniority_level: z.enum(['junior', 'mid', 'senior', 'lead', 'manager']).default('mid'),
        headcount: z.number().int().min(1).default(1),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
        due_date: z.string().optional(),
        notes: z.string().optional(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const { error } = await (ctx.db as any).from('hiring_requests').insert({
        tenant_id: tenantId,
        team_id: input.teamId ?? null,
        requested_by: ctx.user!.sub,
        title: input.title,
        department: input.department ?? null,
        description: input.description ?? null,
        seniority_level: input.seniority_level,
        headcount: input.headcount,
        priority: input.priority,
        due_date: input.due_date ?? null,
        notes: input.notes ?? null,
        status: 'open',
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  updateHiringRequest: managerProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['draft', 'open', 'interviewing', 'filled', 'cancelled']).optional(),
        notes: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user!.tid
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.status !== undefined) update.status = input.status
      if (input.notes !== undefined) update.notes = input.notes
      if (input.priority !== undefined) update.priority = input.priority
      const { error } = await (ctx.db as any)
        .from('hiring_requests')
        .update(update)
        .eq('id', input.id)
        .eq('tenant_id', tenantId)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),
})
