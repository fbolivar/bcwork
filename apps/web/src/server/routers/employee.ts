import { z } from 'zod'
import { createHash } from 'crypto'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { hashPassword, verifyPassword, validatePasswordPolicy } from '@/lib/auth/password'
import { broadcastNotificationToMany } from '@/lib/realtime-broadcast'

const POLICY_VERSION = '1.0'
const CONSENT_TYPE = 'monitoring_basic'

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
        'effective_from, effective_to, work_schedules(name, weekly_hours, start_time, end_time, days_of_week, break_minutes, disconnection_grace_minutes, timezone, break_alert_enabled, break_alert_interval_minutes, break_alert_message, end_of_day_alert_enabled, end_of_day_alert_offset_minutes, end_of_day_alert_message)',
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
      days_of_week: number[]
      break_minutes: number
      disconnection_grace_minutes: number
      timezone: string
      break_alert_enabled: boolean
      break_alert_interval_minutes: number
      break_alert_message: string
      end_of_day_alert_enabled: boolean
      end_of_day_alert_offset_minutes: number
      end_of_day_alert_message: string
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

  // ─── Consentimiento informado (Ley 1581/2012) ────────────────────────────

  hasConsented: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.db
      .from('consents')
      .select('id')
      .eq('user_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .eq('consent_type', CONSENT_TYPE)
      .eq('granted', true)
      .is('revoked_at', null)
      .maybeSingle()
    return { consented: !!data }
  }),

  // ─── Actualizar perfil ────────────────────────────────────────────────────

  updateMyProfile: protectedProcedure
    .input(
      z.object({
        full_name: z.string().min(1).max(200).optional(),
        department: z.string().max(100).optional(),
        position: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      type UserUpdate = import('@bcwork/db').Database['public']['Tables']['users']['Update']
      const updates: UserUpdate = {}
      if (input.full_name !== undefined) updates.full_name = input.full_name
      if (input.department !== undefined) updates.department = input.department
      if (input.position !== undefined) updates.position = input.position

      if (!updates.full_name && !updates.department && !updates.position) return { ok: true }

      const { error } = await ctx.db
        .from('users')
        .update(updates)
        .eq('id', ctx.user!.sub)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Cambiar contraseña (verificando la actual) ───────────────────────────

  changeMyPassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const policyError = validatePasswordPolicy(input.newPassword)
      if (policyError) throw new TRPCError({ code: 'BAD_REQUEST', message: policyError })

      const { data: user, error } = await ctx.db
        .from('users')
        .select('id, password_hash')
        .eq('id', ctx.user!.sub)
        .single()

      if (error || !user)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' })

      const valid = await verifyPassword(input.currentPassword, user.password_hash ?? '')
      if (!valid)
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Contraseña actual incorrecta' })

      const newHash = await hashPassword(input.newPassword)
      const { error: updErr } = await ctx.db
        .from('users')
        .update({
          password_hash: newHash,
          password_changed_at: new Date().toISOString(),
          must_change_password: false,
        })
        .eq('id', ctx.user!.sub)

      if (updErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updErr.message })
      return { ok: true }
    }),

  // ─── Mis sesiones ─────────────────────────────────────────────────────────

  getMySessions: protectedProcedure
    .input(
      z.object({
        days: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(60)]).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const from = new Date(Date.now() - input.days * 86400000).toISOString()

      const { data, error } = await ctx.db
        .from('work_sessions')
        .select('id, started_at, ended_at, active_seconds, idle_seconds, location_type, status')
        .eq('tenant_id', ctx.user!.tid)
        .eq('user_id', ctx.user!.sub)
        .gte('started_at', from)
        .order('started_at', { ascending: false })
        .limit(200)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // ─── Actividad de un día específico (resumen top apps) ──────────────────

  getMyDayActivity: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('daily_user_metrics')
        .select('apps_top, active_seconds, productive_seconds')
        .eq('tenant_id', ctx.user!.tid)
        .eq('user_id', ctx.user!.sub)
        .eq('metric_date', input.date)
        .maybeSingle()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      if (!data) return { apps: [], activeSeconds: 0, productiveSeconds: 0 }

      type AppEntry = { name: string; secs: number }
      const apps = Array.isArray(data.apps_top) ? (data.apps_top as AppEntry[]).slice(0, 8) : []

      return {
        apps,
        activeSeconds: data.active_seconds ?? 0,
        productiveSeconds: data.productive_seconds ?? 0,
      }
    }),

  // ─── Timeline detallado de actividad (evento a evento) ───────────────────

  getMyActivityTimeline: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const from = `${input.date}T00:00:00.000Z`
      const to = `${input.date}T23:59:59.999Z`

      const [eventsRes, metricsRes] = await Promise.all([
        ctx.db
          .from('activity_events')
          .select(
            'id, started_at, duration_seconds, app_identifier, window_title, productivity, event_type',
          )
          .eq('tenant_id', ctx.user!.tid)
          .eq('user_id', ctx.user!.sub)
          .gte('started_at', from)
          .lte('started_at', to)
          .order('started_at', { ascending: true })
          .limit(500),
        ctx.db
          .from('daily_user_metrics')
          .select(
            'active_seconds, productive_seconds, non_productive_seconds, overtime_seconds, productivity_ratio',
          )
          .eq('tenant_id', ctx.user!.tid)
          .eq('user_id', ctx.user!.sub)
          .eq('metric_date', input.date)
          .maybeSingle(),
      ])

      if (eventsRes.error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: eventsRes.error.message })

      const events = (eventsRes.data ?? []).map((e) => ({
        id: String(e.id),
        started_at: e.started_at,
        duration_seconds: e.duration_seconds ?? 0,
        app_identifier: e.app_identifier ?? null,
        window_title: e.window_title ?? null,
        productivity: (e.productivity ?? 'neutral') as
          | 'productive'
          | 'unproductive'
          | 'neutral'
          | 'idle',
        event_type: e.event_type,
      }))

      const summary = metricsRes.data
        ? {
            active_seconds: metricsRes.data.active_seconds ?? 0,
            productive_seconds: metricsRes.data.productive_seconds ?? 0,
            non_productive_seconds: metricsRes.data.non_productive_seconds ?? 0,
            overtime_seconds: metricsRes.data.overtime_seconds ?? 0,
            productivity_ratio: Number(metricsRes.data.productivity_ratio ?? 0),
          }
        : null

      return { events, summary }
    }),

  // ─── Solicitar corrección de actividad ────────────────────────────────────

  requestActivityEdit: protectedProcedure
    .input(
      z.object({
        applies_to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        edit_type: z.enum(['missed_session', 'wrong_app', 'duration_error', 'other']),
        reason: z.string().min(5).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from('activity_edits').insert({
        tenant_id: ctx.user!.tid,
        user_id: ctx.user!.sub,
        proposed_by: ctx.user!.sub,
        applies_to_date: input.applies_to_date,
        edit_type: input.edit_type,
        payload:
          {} as import('@bcwork/db').Database['public']['Tables']['activity_edits']['Insert']['payload'],
        reason: input.reason,
        status: 'pending',
      })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Notificar a managers y tenant_admins del tenant
      const { data: managers } = await ctx.db
        .from('users')
        .select('id')
        .eq('tenant_id', ctx.user!.tid)
        .in('role', ['manager', 'tenant_admin'])
        .eq('status', 'active')

      if (managers && managers.length > 0) {
        await ctx.db.from('notifications').insert(
          managers.map((m) => ({
            tenant_id: ctx.user!.tid,
            user_id: m.id,
            channel: 'in_app' as const,
            title: 'Nueva solicitud de corrección',
            body: `Un empleado solicitó corrección de actividad para el ${input.applies_to_date}.`,
          })),
        )
        broadcastNotificationToMany(managers.map((m) => m.id))
      }

      return { ok: true }
    }),

  // ─── Ver mis solicitudes de corrección ───────────────────────────────────

  getMyActivityEdits: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('activity_edits')
      .select(
        'id, applies_to_date, edit_type, reason, status, review_note, created_at, reviewed_at',
      )
      .eq('tenant_id', ctx.user!.tid)
      .eq('user_id', ctx.user!.sub)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // ─── Detalle de consentimiento ────────────────────────────────────────────

  getMyConsentDetails: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.db
      .from('consents')
      .select('id, granted, granted_at, revoked_at, policy_version, consent_type')
      .eq('user_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .eq('consent_type', CONSENT_TYPE)
      .order('granted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data ?? null
  }),

  // ─── Revocar consentimiento ───────────────────────────────────────────────

  revokeConsent: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.db
      .from('consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .eq('consent_type', CONSENT_TYPE)
      .is('revoked_at', null)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    ctx.db
      .from('audit_logs')
      .insert({
        tenant_id: ctx.user!.tid,
        actor_user_id: ctx.user!.sub,
        action: 'consent.revoked',
        entity_type: 'consent',
      })
      .then(({ error: auditErr }) => {
        if (auditErr) console.error('[audit] consent.revoked:', auditErr.message)
      })

    return { ok: true }
  }),

  // ─── Código de enrolamiento (auto-generado para el empleado) ─────────────

  getOrCreateEnrollmentCode: protectedProcedure.mutation(async ({ ctx }) => {
    const { randomBytes, createHash } = await import('crypto')

    // Reutilizar código válido si existe
    const { data: existing } = await ctx.db
      .from('enrollment_codes')
      .select('id, code, expires_at')
      .eq('tenant_id', ctx.user!.tid)
      .eq('user_id', ctx.user!.sub)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.code) {
      return { code: existing.code as string, expiresAt: existing.expires_at as string }
    }

    // Invalidar anteriores sin usar
    await ctx.db
      .from('enrollment_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('tenant_id', ctx.user!.tid)
      .eq('user_id', ctx.user!.sub)
      .is('used_at', null)

    const code = randomBytes(6).toString('base64url').toUpperCase().slice(0, 8)
    const codeHash = createHash('sha256').update(code).digest('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h

    const { data, error } = await ctx.db
      .from('enrollment_codes')
      .insert({
        tenant_id: ctx.user!.tid,
        user_id: ctx.user!.sub,
        created_by: ctx.user!.sub,
        code,
        code_hash: codeHash,
        expires_at: expiresAt,
      })
      .select('code, expires_at')
      .single()

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { code: data.code as string, expiresAt: data.expires_at as string }
  }),

  grantConsent: protectedProcedure
    .input(z.object({ userAgent: z.string().max(500) }))
    .mutation(async ({ ctx, input }) => {
      const grantedAt = new Date().toISOString()
      const evidenceRaw = `${ctx.user!.sub}:${CONSENT_TYPE}:${POLICY_VERSION}:${grantedAt}`
      const evidenceHash = createHash('sha256').update(evidenceRaw).digest('hex')

      const { error } = await ctx.db.from('consents').insert({
        tenant_id: ctx.user!.tid,
        user_id: ctx.user!.sub,
        policy_version: POLICY_VERSION,
        consent_type: CONSENT_TYPE,
        granted: true,
        granted_at: grantedAt,
        evidence_hash: evidenceHash,
        user_agent: input.userAgent.slice(0, 500),
      })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      ctx.db
        .from('audit_logs')
        .insert({
          tenant_id: ctx.user!.tid,
          actor_user_id: ctx.user!.sub,
          action: 'consent.granted',
          entity_type: 'consent',
        })
        .then(({ error: auditErr }) => {
          if (auditErr) console.error('[audit] consent.granted:', auditErr.message)
        })

      return { ok: true }
    }),

  // ─── Mis capturas de pantalla ─────────────────────────────────────────────

  getMyScreenshots: protectedProcedure
    .input(
      z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('screenshots')
        .select('id, taken_at, storage_path, thumbnail_path, width, height, session_id')
        .eq('tenant_id', ctx.user!.tid)
        .eq('user_id', ctx.user!.sub)
        .order('taken_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (input.date) {
        q = q.gte('taken_at', `${input.date}T00:00:00Z`).lte('taken_at', `${input.date}T23:59:59Z`)
      }

      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const rows = data ?? []
      if (rows.length === 0) return { screenshots: [], total: 0 }

      const paths = rows.map((r) => r.thumbnail_path ?? r.storage_path)
      const { data: signed } = await ctx.db.storage
        .from('screenshots')
        .createSignedUrls(paths, 3600)

      const urlMap = new Map<string, string>()
      signed?.forEach((s) => {
        if (s.signedUrl && s.path) urlMap.set(s.path, s.signedUrl)
      })

      const { count } = await ctx.db
        .from('screenshots')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', ctx.user!.tid)
        .eq('user_id', ctx.user!.sub)

      return {
        screenshots: rows.map((r) => ({
          ...r,
          url: urlMap.get(r.thumbnail_path ?? r.storage_path) ?? null,
        })),
        total: count ?? 0,
      }
    }),

  // ─── Mis ausencias ────────────────────────────────────────────────────────

  getMyTimeOff: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('time_off')
      .select('id, type, starts_on, ends_on, status, notes, created_at, approved_by')
      .eq('tenant_id', ctx.user!.tid)
      .eq('user_id', ctx.user!.sub)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  requestTimeOff: protectedProcedure
    .input(
      z.object({
        type: z.enum(['vacation', 'sick', 'personal', 'maternity', 'paternity', 'other']),
        starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.ends_on < input.starts_on) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La fecha de fin debe ser igual o posterior a la de inicio',
        })
      }

      const { data, error } = await ctx.db
        .from('time_off')
        .insert({
          tenant_id: ctx.user!.tid,
          user_id: ctx.user!.sub,
          type: input.type,
          starts_on: input.starts_on,
          ends_on: input.ends_on,
          notes: input.notes ?? null,
          status: 'pending',
        })
        .select('id')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Notificar a managers y admins
      const { data: managers } = await ctx.db
        .from('users')
        .select('id')
        .eq('tenant_id', ctx.user!.tid)
        .in('role', ['manager', 'tenant_admin'])
        .eq('status', 'active')

      if (managers && managers.length > 0) {
        await ctx.db.from('notifications').insert(
          managers.map((m) => ({
            tenant_id: ctx.user!.tid,
            user_id: m.id,
            channel: 'in_app' as const,
            title: 'Nueva solicitud de ausencia',
            body: `Un empleado solicitó ${input.type} del ${input.starts_on} al ${input.ends_on}.`,
            sent_by: ctx.user!.sub,
          })),
        )
        broadcastNotificationToMany(managers.map((m) => m.id))
      }

      return { ok: true, id: data.id }
    }),

  cancelTimeOff: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('time_off')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user!.sub)
        .eq('tenant_id', ctx.user!.tid)
        .eq('status', 'pending')

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Exportar mis datos ───────────────────────────────────────────────────

  getMyExportData: protectedProcedure.query(async ({ ctx }) => {
    const from90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)

    const [profileRes, sessionsRes, metricsRes, timeOffRes, consentsRes, editsRes] =
      await Promise.all([
        ctx.db
          .from('users')
          .select('full_name, email, role, department, position, created_at, last_login_at')
          .eq('id', ctx.user!.sub)
          .single(),
        ctx.db
          .from('work_sessions')
          .select('started_at, ended_at, active_seconds, idle_seconds, ip_inet')
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .gte('started_at', `${from90}T00:00:00Z`)
          .order('started_at', { ascending: false })
          .limit(500),
        ctx.db
          .from('daily_user_metrics')
          .select(
            'metric_date, active_seconds, productive_seconds, non_productive_seconds, overtime_seconds, productivity_ratio',
          )
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .gte('metric_date', from90)
          .order('metric_date', { ascending: false }),
        ctx.db
          .from('time_off')
          .select('type, starts_on, ends_on, status, notes, created_at')
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .order('created_at', { ascending: false }),
        ctx.db
          .from('consents')
          .select('consent_type, granted, granted_at, revoked_at, policy_version')
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .order('granted_at', { ascending: false }),
        ctx.db
          .from('activity_edits')
          .select('applies_to_date, edit_type, reason, status, review_note, created_at')
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .order('created_at', { ascending: false }),
      ])

    return {
      exported_at: new Date().toISOString(),
      profile: profileRes.data ?? null,
      sessions: sessionsRes.data ?? [],
      daily_metrics: metricsRes.data ?? [],
      time_off: timeOffRes.data ?? [],
      consents: consentsRes.data ?? [],
      correction_requests: editsRes.data ?? [],
    }
  }),

  // ─── Registro de tiempo manual ────────────────────────────────────────────

  getMyManualTimeEntries: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const from = new Date(Date.now() - input.days * 86400000).toISOString().slice(0, 10)

      const { data, error } = await ctx.db
        .from('manual_time_entries')
        .select(
          'id, entry_date, started_at, ended_at, duration_minutes, entry_type, description, status, review_note, reviewed_at, created_at',
        )
        .eq('tenant_id', ctx.user!.tid)
        .eq('user_id', ctx.user!.sub)
        .gte('entry_date', from)
        .order('entry_date', { ascending: false })
        .order('started_at', { ascending: false })
        .limit(100)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  createManualTimeEntry: protectedProcedure
    .input(
      z.object({
        entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        started_at: z.string().regex(/^\d{2}:\d{2}$/),
        ended_at: z.string().regex(/^\d{2}:\d{2}$/),
        entry_type: z.enum(['meeting', 'call', 'travel', 'training', 'offline_work', 'other']),
        description: z.string().min(5).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.ended_at <= input.started_at) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La hora de fin debe ser posterior a la de inicio',
        })
      }

      // No permitir entradas en el futuro
      const today = new Date().toISOString().slice(0, 10)
      if (input.entry_date > today) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No puedes registrar tiempo en el futuro',
        })
      }

      const { data, error } = await ctx.db
        .from('manual_time_entries')
        .insert({
          tenant_id: ctx.user!.tid,
          user_id: ctx.user!.sub,
          entry_date: input.entry_date,
          started_at: input.started_at,
          ended_at: input.ended_at,
          entry_type: input.entry_type,
          description: input.description,
          status: 'pending',
        } as import('@bcwork/db').Database['public']['Tables']['manual_time_entries']['Insert'])
        .select('id')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Notificar a managers
      const { data: managers } = await ctx.db
        .from('users')
        .select('id')
        .eq('tenant_id', ctx.user!.tid)
        .in('role', ['manager', 'tenant_admin'])
        .eq('status', 'active')

      if (managers && managers.length > 0) {
        await ctx.db.from('notifications').insert(
          managers.map((m) => ({
            tenant_id: ctx.user!.tid,
            user_id: m.id,
            channel: 'in_app' as const,
            title: 'Nueva entrada de tiempo manual',
            body: `Un empleado registró tiempo manual (${input.entry_type}) para el ${input.entry_date}.`,
            sent_by: ctx.user!.sub,
          })),
        )
        broadcastNotificationToMany(managers.map((m) => m.id))
      }

      return { ok: true, id: data.id }
    }),

  cancelManualTimeEntry: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('manual_time_entries')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user!.sub)
        .eq('tenant_id', ctx.user!.tid)
        .eq('status', 'pending')

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),
})
