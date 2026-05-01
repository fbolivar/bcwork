import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const employeeRouter = router({
  // ─── Mi perfil ────────────────────────────────────────────────────────────

  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('users')
      .select(
        'id, full_name, email, role, status, department, position, last_login_at, mfa_enabled, must_change_password, created_at',
      )
      .eq('id', ctx.user!.sub)
      .single()

    if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' })
    return data
  }),

  // ─── Mi horario ───────────────────────────────────────────────────────────

  getMySchedule: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await ctx.db
      .from('user_schedules')
      .select(
        'effective_from, effective_to, work_schedules(name, weekly_hours, start_time, end_time, workdays, break_minutes, disconnection_grace_minutes)',
      )
      .eq('user_id', ctx.user!.sub)
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    const ws = data?.work_schedules
    const schedule = Array.isArray(ws) ? (ws[0] ?? null) : (ws ?? null)
    return schedule as {
      name: string
      weekly_hours: number
      start_time: string
      end_time: string
      workdays: number[]
      break_minutes: number
      disconnection_grace_minutes: number
    } | null
  }),

  // ─── Mi sesión activa ─────────────────────────────────────────────────────

  getActiveSession: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.db
      .from('work_sessions')
      .select(
        'id, started_at, active_seconds, idle_seconds, productive_seconds, non_productive_seconds, location_type',
      )
      .eq('user_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data ?? null
  }),

  // ─── Mis métricas (resumen de período) ────────────────────────────────────

  getMyMetrics: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(14) }))
    .query(async ({ ctx, input }) => {
      const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

      const { data, error } = await ctx.db
        .from('daily_user_metrics')
        .select(
          'metric_date, active_seconds, productive_seconds, non_productive_seconds, productivity_ratio, focus_score, overtime_seconds, apps_top, domains_top, location_type',
        )
        .eq('tenant_id', ctx.user!.tid)
        .eq('user_id', ctx.user!.sub)
        .gte('metric_date', from)
        .order('metric_date', { ascending: true })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const rows = (data ?? []).map((m) => ({
        ...m,
        productivity_ratio: Number(m.productivity_ratio ?? 0),
        focus_score: m.focus_score != null ? Number(m.focus_score) : null,
      }))

      const totalActive = rows.reduce((s, r) => s + (r.active_seconds ?? 0), 0)
      const totalProductive = rows.reduce((s, r) => s + (r.productive_seconds ?? 0), 0)
      const avgRatio =
        rows.length > 0 ? rows.reduce((s, r) => s + r.productivity_ratio, 0) / rows.length : 0
      const totalOvertime = rows.reduce((s, r) => s + (r.overtime_seconds ?? 0), 0)

      return {
        series: rows,
        summary: {
          total_active_seconds: totalActive,
          total_productive_seconds: totalProductive,
          avg_productivity_ratio: avgRatio,
          total_overtime_seconds: totalOvertime,
          days_with_activity: rows.length,
        },
      }
    }),

  // ─── Actividad de hoy ────────────────────────────────────────────────────

  getTodayActivity: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    const { data, error } = await ctx.db
      .from('activity_events')
      .select('event_type, app_identifier, domain, productivity, started_at, duration_seconds')
      .eq('tenant_id', ctx.user!.tid)
      .eq('user_id', ctx.user!.sub)
      .gte('started_at', today)
      .lt('started_at', tomorrow)
      .order('started_at', { ascending: true })
      .limit(200)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    // Agrupar por app/dominio para resumen
    const byApp = new Map<string, { secs: number; productivity: string | null }>()
    for (const ev of data ?? []) {
      const key = ev.app_identifier ?? ev.domain ?? 'Desconocido'
      const curr = byApp.get(key) ?? { secs: 0, productivity: ev.productivity }
      curr.secs += ev.duration_seconds ?? 0
      byApp.set(key, curr)
    }

    const topApps = Array.from(byApp.entries())
      .sort((a, b) => b[1].secs - a[1].secs)
      .slice(0, 10)
      .map(([name, v]) => ({ name, secs: v.secs, productivity: v.productivity }))

    const totalSecs = (data ?? []).reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
    const productiveSecs = (data ?? [])
      .filter((e) => e.productivity === 'productive')
      .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)

    return {
      events: data ?? [],
      topApps,
      totalActiveSeconds: totalSecs,
      productiveSeconds: productiveSecs,
    }
  }),

  // ─── Mis dispositivos ─────────────────────────────────────────────────────

  getMyDevices: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('agent_devices')
      .select('id, name, platform, hostname, enrolled_at, last_seen_at, revoked_at')
      .eq('tenant_id', ctx.user!.tid)
      .eq('user_id', ctx.user!.sub)
      .order('enrolled_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),
})
