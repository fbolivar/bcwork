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

  // ─── Ficha de asistencia ─────────────────────────────────────────────────

  getMyTimesheet: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      const { year, month } = input
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

      const [sessionsRes, metricsRes, scheduleRes] = await Promise.all([
        ctx.db
          .from('work_sessions')
          .select('id, started_at, ended_at, active_seconds, idle_seconds, source, status')
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .gte('started_at', `${startDate}T00:00:00`)
          .lte('started_at', `${endDate}T23:59:59`)
          .order('started_at', { ascending: true }),
        ctx.db
          .from('daily_user_metrics')
          .select(
            'metric_date, active_seconds, expected_seconds, overtime_seconds, productivity_ratio',
          )
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .gte('metric_date', startDate)
          .lte('metric_date', endDate),
        ctx.db
          .from('user_schedules')
          .select('work_schedules(days_of_week, weekly_hours, start_time, end_time)')
          .eq('user_id', ctx.user!.sub)
          .lte('effective_from', endDate)
          .or(`effective_to.is.null,effective_to.gte.${startDate}`)
          .order('effective_from', { ascending: false })
          .limit(1)
          .single(),
      ])

      const sessions = sessionsRes.data ?? []
      const metrics = metricsRes.data ?? []
      const schedule =
        (scheduleRes.data?.work_schedules as {
          days_of_week: number[]
          weekly_hours: number
          start_time: string
          end_time: string
        } | null) ?? null

      // Group sessions by date
      const sessionsByDate = new Map<string, typeof sessions>()
      for (const s of sessions) {
        const date = s.started_at.slice(0, 10)
        if (!sessionsByDate.has(date)) sessionsByDate.set(date, [])
        sessionsByDate.get(date)!.push(s)
      }

      // Build daily rows for each day of month
      const daysInMonth = new Date(year, month, 0).getDate()
      const workDays = (schedule?.days_of_week ?? [1, 2, 3, 4, 5]) as number[]
      const expectedSecsPerDay = schedule?.weekly_hours
        ? Math.round((schedule.weekly_hours * 3600) / workDays.length)
        : 28800

      const rows = []
      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const dow = new Date(date).getDay()
        const isWorkDay = workDays.includes(dow)
        const daySessions = sessionsByDate.get(date) ?? []
        const metric = metrics.find((m) => m.metric_date === date)

        const firstIn = daySessions.length > 0 ? daySessions[0]!.started_at : null
        const lastOut =
          daySessions.length > 0 ? daySessions[daySessions.length - 1]!.ended_at : null
        const workedSecs =
          metric?.active_seconds ?? daySessions.reduce((s, ws) => s + (ws.active_seconds ?? 0), 0)
        const overtimeSecs = metric?.overtime_seconds ?? 0
        const expectedSecs = metric?.expected_seconds ?? (isWorkDay ? expectedSecsPerDay : 0)
        const productivityRatio = metric?.productivity_ratio ?? 0

        let status: 'present' | 'partial' | 'absent' | 'non_work_day' | 'future'
        const today = new Date().toISOString().slice(0, 10)
        if (date > today) {
          status = 'future'
        } else if (!isWorkDay) {
          status = 'non_work_day'
        } else if (workedSecs === 0) {
          status = 'absent'
        } else if (expectedSecs > 0 && workedSecs / expectedSecs < 0.5) {
          status = 'partial'
        } else {
          status = 'present'
        }

        rows.push({
          date,
          dow,
          isWorkDay,
          firstIn,
          lastOut,
          workedSecs,
          expectedSecs,
          overtimeSecs,
          productivityRatio,
          sessionCount: daySessions.length,
          status,
        })
      }

      return { rows, year, month }
    }),

  // ─── Check-in / Check-out manual ────────────────────────────────────────

  manualCheckin: protectedProcedure.mutation(async ({ ctx }) => {
    // Close any open manual sessions first
    await ctx.db
      .from('work_sessions')
      .update({ ended_at: new Date().toISOString(), status: 'closed' })
      .eq('user_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .eq('source', 'manual')
      .is('ended_at', null)

    const { data, error } = await ctx.db
      .from('work_sessions')
      .insert({
        tenant_id: ctx.user!.tid,
        user_id: ctx.user!.sub,
        started_at: new Date().toISOString(),
        source: 'manual',
        status: 'open',
      })
      .select('id, started_at')
      .single()

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { ok: true, session: data }
  }),

  manualCheckout: protectedProcedure
    .input(z.object({ session_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString()
      const { data: session, error: fetchError } = await ctx.db
        .from('work_sessions')
        .select('started_at')
        .eq('id', input.session_id)
        .eq('user_id', ctx.user!.sub)
        .single()

      if (fetchError || !session) throw new TRPCError({ code: 'NOT_FOUND' })

      const durationSecs = Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000)

      const { error } = await ctx.db
        .from('work_sessions')
        .update({ ended_at: now, status: 'closed', active_seconds: durationSecs })
        .eq('id', input.session_id)
        .eq('user_id', ctx.user!.sub)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getMyManualSession: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.db
      .from('work_sessions')
      .select('id, started_at, active_seconds')
      .eq('user_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .eq('source', 'manual')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    return data ?? null
  }),

  // ─── Calendario de asistencia ────────────────────────────────────────────

  getMyAttendanceCalendar: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      const { year, month } = input
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

      const [metricsRes, timeOffRes, scheduleRes] = await Promise.all([
        ctx.db
          .from('daily_user_metrics')
          .select('metric_date, active_seconds, expected_seconds')
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .gte('metric_date', startDate)
          .lte('metric_date', endDate),
        ctx.db
          .from('time_off')
          .select('starts_on, ends_on')
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .eq('status', 'approved')
          .lte('starts_on', endDate)
          .gte('ends_on', startDate),
        ctx.db
          .from('user_schedules')
          .select('work_schedules(days_of_week)')
          .eq('user_id', ctx.user!.sub)
          .lte('effective_from', endDate)
          .or(`effective_to.is.null,effective_to.gte.${startDate}`)
          .order('effective_from', { ascending: false })
          .limit(1)
          .single(),
      ])

      const metrics = metricsRes.data ?? []
      const timeOff = timeOffRes.data ?? []
      const workDays = ((scheduleRes.data?.work_schedules as { days_of_week: number[] } | null)
        ?.days_of_week ?? [1, 2, 3, 4, 5]) as number[]

      const timeOffDates = new Set<string>()
      for (const to of timeOff) {
        const start = new Date(to.starts_on)
        const end = new Date(to.ends_on)
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          timeOffDates.add(d.toISOString().slice(0, 10))
        }
      }

      const daysInMonth = new Date(year, month, 0).getDate()
      const today = new Date().toISOString().slice(0, 10)
      const days = []
      let presentCount = 0,
        partialCount = 0,
        absentCount = 0,
        timeOffCount = 0

      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const dow = new Date(date).getDay()
        const isWorkDay = workDays.includes(dow)
        const metric = metrics.find((m) => m.metric_date === date)
        const isTimeOff = timeOffDates.has(date)

        let status: 'present' | 'partial' | 'absent' | 'time_off' | 'non_work_day' | 'future'
        if (date > today) {
          status = 'future'
        } else if (isTimeOff) {
          status = 'time_off'
          timeOffCount++
        } else if (!isWorkDay) {
          status = 'non_work_day'
        } else {
          const worked = metric?.active_seconds ?? 0
          const expected = metric?.expected_seconds ?? 28800
          if (worked === 0) {
            status = 'absent'
            absentCount++
          } else if (worked / expected < 0.5) {
            status = 'partial'
            partialCount++
          } else {
            status = 'present'
            presentCount++
          }
        }

        days.push({ date, dow, status })
      }

      return {
        days,
        summary: { presentCount, partialCount, absentCount, timeOffCount },
        year,
        month,
      }
    }),

  // ─── Bienestar laboral ───────────────────────────────────────────────────

  getMyWellness: protectedProcedure
    .input(z.object({ days: z.number().int().min(7).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date()
      since.setDate(since.getDate() - input.days)
      const sinceStr = since.toISOString().slice(0, 10)

      const { data: metrics } = await ctx.db
        .from('daily_user_metrics')
        .select(
          'metric_date, active_seconds, expected_seconds, overtime_seconds, productivity_ratio, focus_score',
        )
        .eq('user_id', ctx.user!.sub)
        .eq('tenant_id', ctx.user!.tid)
        .gte('metric_date', sinceStr)
        .order('metric_date', { ascending: true })

      const rows = metrics ?? []
      const workDays = rows.filter((r) => (r.active_seconds ?? 0) > 0)
      const totalDays = workDays.length

      const avgDailyHours =
        totalDays > 0
          ? workDays.reduce((s, r) => s + (r.active_seconds ?? 0), 0) / totalDays / 3600
          : 0
      const avgProductivity =
        totalDays > 0
          ? workDays.reduce((s, r) => s + (r.productivity_ratio ?? 0), 0) / totalDays
          : 0
      const totalOvertime = rows.reduce((s, r) => s + (r.overtime_seconds ?? 0), 0)
      const daysWithOvertime = rows.filter((r) => (r.overtime_seconds ?? 0) > 0).length
      const avgFocusScore =
        totalDays > 0 ? workDays.reduce((s, r) => s + (r.focus_score ?? 0), 0) / totalDays : 0

      // Wellness score: 100 = perfect balance
      // Factors: avg hours (ideal 7-8h), overtime frequency, productivity
      const hoursFactor = Math.max(0, 1 - Math.abs(avgDailyHours - 7.5) / 7.5)
      const overtimeFactor = totalDays > 0 ? Math.max(0, 1 - daysWithOvertime / totalDays) : 1
      const productivityFactor = avgProductivity
      const wellnessScore = Math.round(
        (hoursFactor * 0.4 + overtimeFactor * 0.35 + productivityFactor * 0.25) * 100,
      )

      const overTimeSeries = rows.map((r) => ({
        date: r.metric_date ?? '',
        overtimeSecs: r.overtime_seconds ?? 0,
        activeSecs: r.active_seconds ?? 0,
      }))

      return {
        wellnessScore,
        avgDailyHours: Math.round(avgDailyHours * 10) / 10,
        avgProductivity: Math.round(avgProductivity * 100),
        totalOvertimeSecs: totalOvertime,
        daysWithOvertime,
        totalDays,
        avgFocusScore: Math.round(avgFocusScore * 10) / 10,
        overTimeSeries,
        days: input.days,
      }
    }),

  // ─── Proyectos y tareas ──────────────────────────────────────────────────

  getMyProjects: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('projects')
      .select('id, name, description, color, is_active, created_at')
      .eq('tenant_id', ctx.user!.tid)
      .eq('is_active', true)
      .order('name')

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  getProjectTasks: protectedProcedure
    .input(z.object({ project_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('project_tasks')
        .select('id, name, description, is_active')
        .eq('project_id', input.project_id)
        .eq('tenant_id', ctx.user!.tid)
        .eq('is_active', true)
        .order('name')

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  logProjectTime: protectedProcedure
    .input(
      z.object({
        project_id: z.string().uuid(),
        task_id: z.string().uuid().optional(),
        started_at: z.string().datetime(),
        ended_at: z.string().datetime(),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const start = new Date(input.started_at)
      const end = new Date(input.ended_at)
      if (end <= start)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'La hora de fin debe ser posterior al inicio',
        })

      const { data, error } = await ctx.db
        .from('project_time_entries')
        .insert({
          tenant_id: ctx.user!.tid,
          user_id: ctx.user!.sub,
          project_id: input.project_id,
          task_id: input.task_id ?? null,
          started_at: input.started_at,
          ended_at: input.ended_at,
          notes: input.notes ?? null,
        })
        .select('id')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true, id: data.id }
    }),

  getMyProjectEntries: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date()
      since.setDate(since.getDate() - input.days)

      const { data, error } = await ctx.db
        .from('project_time_entries')
        .select(
          'id, started_at, ended_at, duration_seconds, notes, project_id, task_id, projects(name, color), project_tasks(name)',
        )
        .eq('user_id', ctx.user!.sub)
        .eq('tenant_id', ctx.user!.tid)
        .gte('started_at', since.toISOString())
        .order('started_at', { ascending: false })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // ─── Informe personal (para PDF) ────────────────────────────────────────

  getMyReport: protectedProcedure
    .input(
      z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input

      const [profileRes, metricsRes, sessionsRes, projectsRes] = await Promise.all([
        ctx.db
          .from('users')
          .select('full_name, email, department, position')
          .eq('id', ctx.user!.sub)
          .single(),
        ctx.db
          .from('daily_user_metrics')
          .select(
            'metric_date, active_seconds, productive_seconds, overtime_seconds, productivity_ratio, expected_seconds',
          )
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .gte('metric_date', startDate)
          .lte('metric_date', endDate)
          .order('metric_date', { ascending: true }),
        ctx.db
          .from('work_sessions')
          .select('id, started_at, ended_at, active_seconds, location_type')
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .gte('started_at', `${startDate}T00:00:00`)
          .lte('started_at', `${endDate}T23:59:59`)
          .order('started_at', { ascending: false })
          .limit(100),
        ctx.db
          .from('project_time_entries')
          .select('duration_seconds, projects(name, color)')
          .eq('user_id', ctx.user!.sub)
          .eq('tenant_id', ctx.user!.tid)
          .gte('started_at', `${startDate}T00:00:00`)
          .lte('started_at', `${endDate}T23:59:59`),
      ])

      const metrics = metricsRes.data ?? []
      const sessions = sessionsRes.data ?? []
      const projectEntries = projectsRes.data ?? []

      const totalActiveSecs = metrics.reduce((s, r) => s + (r.active_seconds ?? 0), 0)
      const totalOvertimeSecs = metrics.reduce((s, r) => s + (r.overtime_seconds ?? 0), 0)
      const totalProductiveSecs = metrics.reduce((s, r) => s + (r.productive_seconds ?? 0), 0)
      const workDays = metrics.filter((r) => (r.active_seconds ?? 0) > 0).length
      const avgProductivity =
        workDays > 0
          ? metrics.reduce((s, r) => s + Number(r.productivity_ratio ?? 0), 0) / workDays
          : 0

      const byProject = new Map<string, number>()
      for (const e of projectEntries) {
        const proj = e.projects as { name: string; color: string } | null
        if (!proj) continue
        byProject.set(proj.name, (byProject.get(proj.name) ?? 0) + (e.duration_seconds ?? 0))
      }
      const projectBreakdown = Array.from(byProject.entries())
        .map(([name, secs]) => ({ name, secs }))
        .sort((a, b) => b.secs - a.secs)

      return {
        profile: profileRes.data ?? null,
        startDate,
        endDate,
        summary: {
          totalActiveSecs,
          totalOvertimeSecs,
          totalProductiveSecs,
          workDays,
          totalSessions: sessions.length,
          avgProductivity: Math.round(avgProductivity * 100),
        },
        dailyMetrics: metrics.map((m) => ({
          date: m.metric_date ?? '',
          activeSecs: m.active_seconds ?? 0,
          overtimeSecs: m.overtime_seconds ?? 0,
          productivityRatio: Number(m.productivity_ratio ?? 0),
        })),
        recentSessions: sessions.slice(0, 20).map((s) => ({
          startedAt: s.started_at,
          endedAt: s.ended_at,
          activeSecs: s.active_seconds ?? 0,
          locationType: s.location_type,
        })),
        projectBreakdown,
      }
    }),

  // ─── Solicitud formal de horas extra ────────────────────────────────────

  requestOvertime: protectedProcedure
    .input(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        overtime_seconds: z.number().int().min(60),
        type: z.enum(['payment', 'compensation']),
        reason: z.string().min(5).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from('overtime_requests').insert({
        tenant_id: ctx.user!.tid,
        employee_id: ctx.user!.sub,
        date: input.date,
        overtime_seconds: input.overtime_seconds,
        type: input.type,
        reason: input.reason,
        status: 'pending',
      })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

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
            title: 'Nueva solicitud de horas extra',
            body: `Un empleado solicitó reconocimiento de horas extra para el ${input.date}.`,
          })),
        )
        broadcastNotificationToMany(managers.map((m) => m.id))
      }

      return { ok: true }
    }),

  getMyOvertimeRequests: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'all']).default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('overtime_requests')
        .select('id, date, overtime_seconds, type, reason, status, manager_note, created_at')
        .eq('tenant_id', ctx.user!.tid)
        .eq('employee_id', ctx.user!.sub)
        .order('created_at', { ascending: false })
        .limit(50)

      if (input.status !== 'all') {
        q = q.eq('status', input.status)
      }

      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // ─── Objetivos / KPIs ───────────────────────────────────────────────────

  getMyGoals: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('employee_goals')
      .select(
        'id, title, description, target_value, current_value, unit, due_date, status, created_at',
      )
      .eq('tenant_id', ctx.user!.tid)
      .eq('employee_id', ctx.user!.sub)
      .order('created_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  updateGoalProgress: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        current_value: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: goal, error: fetchErr } = await ctx.db
        .from('employee_goals')
        .select('target_value, status')
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .eq('employee_id', ctx.user!.sub)
        .single()

      if (fetchErr || !goal) throw new TRPCError({ code: 'NOT_FOUND' })
      if (goal.status !== 'active')
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'El objetivo no está activo' })

      const newStatus =
        input.current_value >= (goal.target_value ?? Infinity) ? 'completed' : 'active'

      const { error } = await ctx.db
        .from('employee_goals')
        .update({ current_value: input.current_value, status: newStatus })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .eq('employee_id', ctx.user!.sub)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true, completed: newStatus === 'completed' }
    }),

  // ─── Mensajes / Chat ────────────────────────────────────────────────────

  getMyConversations: protectedProcedure.query(async ({ ctx }) => {
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

    // Get unique interlocutors
    const interlocutorIds = new Set<string>()
    for (const m of msgs) {
      const other = m.from_user_id === userId ? m.to_user_id : m.from_user_id
      interlocutorIds.add(other)
    }

    if (interlocutorIds.size === 0) return []

    const { data: users } = await ctx.db
      .from('users')
      .select('id, full_name, role')
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

  getConversation: protectedProcedure
    .input(
      z.object({
        withUserId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.sub

      const { data, error } = await ctx.db
        .from('messages')
        .select('id, from_user_id, to_user_id, body, read_at, created_at')
        .eq('tenant_id', ctx.user!.tid)
        .or(
          `and(from_user_id.eq.${userId},to_user_id.eq.${input.withUserId}),and(from_user_id.eq.${input.withUserId},to_user_id.eq.${userId})`,
        )
        .order('created_at', { ascending: true })
        .range(input.offset, input.offset + input.limit - 1)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        toUserId: z.string().uuid(),
        body: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: recipient } = await ctx.db
        .from('users')
        .select('id')
        .eq('id', input.toUserId)
        .eq('tenant_id', ctx.user!.tid)
        .single()

      if (!recipient)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Destinatario no encontrado' })

      const { error } = await ctx.db.from('messages').insert({
        tenant_id: ctx.user!.tid,
        from_user_id: ctx.user!.sub,
        to_user_id: input.toUserId,
        body: input.body,
      })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Notify recipient
      await ctx.db.from('notifications').insert({
        tenant_id: ctx.user!.tid,
        user_id: input.toUserId,
        channel: 'in_app' as const,
        title: 'Nuevo mensaje',
        body: input.body.slice(0, 100),
        sent_by: ctx.user!.sub,
      })
      broadcastNotificationToMany([input.toUserId])

      return { ok: true }
    }),

  markMessagesRead: protectedProcedure
    .input(z.object({ fromUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('tenant_id', ctx.user!.tid)
        .eq('to_user_id', ctx.user!.sub)
        .eq('from_user_id', input.fromUserId)
        .is('read_at', null)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getMyManagers: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('users')
      .select('id, full_name, role')
      .eq('tenant_id', ctx.user!.tid)
      .in('role', ['manager', 'tenant_admin'])
      .eq('status', 'active')

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  getMyUnreadMessageCount: protectedProcedure.query(async ({ ctx }) => {
    const { count, error } = await ctx.db
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', ctx.user!.tid)
      .eq('to_user_id', ctx.user!.sub)
      .is('read_at', null)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { count: count ?? 0 }
  }),

  // ─── Ausencias / PTO ──────────────────────────────────────────────────────

  requestAbsence: protectedProcedure
    .input(
      z.object({
        type: z.enum(['vacation', 'sick', 'personal', 'other']),
        start_date: z.string(),
        end_date: z.string(),
        days_count: z.number().min(0.5).max(365),
        reason: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('absence_requests')
        .insert({
          tenant_id: ctx.user!.tid,
          employee_id: ctx.user!.sub,
          type: input.type,
          start_date: input.start_date,
          end_date: input.end_date,
          days_count: input.days_count,
          reason: input.reason ?? null,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Notify managers
      const { data: managers } = await ctx.db
        .from('users')
        .select('id')
        .eq('tenant_id', ctx.user!.tid)
        .in('role', ['tenant_admin', 'manager'])
        .eq('status', 'active')

      if (managers && managers.length > 0) {
        broadcastNotificationToMany(managers.map((m) => m.id))
      }

      return data
    }),

  getMyAbsences: protectedProcedure
    .input(
      z.object({
        status: z.enum(['all', 'pending', 'approved', 'rejected', 'cancelled']).default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('absence_requests')
        .select('*')
        .eq('employee_id', ctx.user!.sub)
        .order('created_at', { ascending: false })

      if (input.status !== 'all') q = q.eq('status', input.status)

      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  getMyPTOBalance: protectedProcedure.query(async ({ ctx }) => {
    const year = new Date().getFullYear()
    const { data, error } = await ctx.db
      .from('absence_balances')
      .select('*')
      .eq('employee_id', ctx.user!.sub)
      .eq('year', year)
      .maybeSingle()

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    // Return defaults if no balance row yet
    return (
      data ?? {
        vacation_days_total: 15,
        vacation_days_used: 0,
        sick_days_total: 15,
        sick_days_used: 0,
        year,
      }
    )
  }),

  cancelAbsenceRequest: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('absence_requests')
        .update({ status: 'cancelled' })
        .eq('id', input.id)
        .eq('employee_id', ctx.user!.sub)
        .eq('status', 'pending')

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Pausas (Breaks) ──────────────────────────────────────────────────────

  startBreak: protectedProcedure
    .input(
      z.object({
        type: z.enum(['lunch', 'rest', 'personal', 'other']),
        note: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // End any active break first
      await ctx.db
        .from('break_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('employee_id', ctx.user!.sub)
        .is('ended_at', null)

      const { data, error } = await ctx.db
        .from('break_sessions')
        .insert({
          tenant_id: ctx.user!.tid,
          employee_id: ctx.user!.sub,
          type: input.type,
          note: input.note ?? null,
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  endBreak: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.db
      .from('break_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('employee_id', ctx.user!.sub)
      .is('ended_at', null)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { ok: true }
  }),

  getActiveBreak: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('break_sessions')
      .select('*')
      .eq('employee_id', ctx.user!.sub)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data
  }),

  getBreakHistory: protectedProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const date = input.date ?? new Date().toISOString().slice(0, 10)
      const { data, error } = await ctx.db
        .from('break_sessions')
        .select('*')
        .eq('employee_id', ctx.user!.sub)
        .gte('started_at', `${date}T00:00:00Z`)
        .lte('started_at', `${date}T23:59:59Z`)
        .order('started_at', { ascending: false })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // ─── Presencia del equipo ─────────────────────────────────────────────────

  getTeamPresence: protectedProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [sessionsRes, usersRes] = await Promise.all([
      ctx.db
        .from('work_sessions')
        .select('user_id, started_at, ended_at')
        .eq('tenant_id', ctx.user!.tid)
        .gte('started_at', since),
      ctx.db
        .from('users')
        .select('id, full_name, department, position, status')
        .eq('tenant_id', ctx.user!.tid)
        .eq('status', 'active')
        .neq('id', ctx.user!.sub),
    ])

    const sessions = sessionsRes.data ?? []
    const users = usersRes.data ?? []

    return users
      .map((u) => {
        const userSessions = sessions.filter((s) => s.user_id === u.id)
        const activeSession = userSessions.find((s) => !s.ended_at)
        const lastSession = userSessions.sort(
          (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
        )[0]
        return {
          id: u.id,
          full_name: u.full_name,
          department: u.department,
          position: u.position,
          is_online: !!activeSession,
          last_seen: lastSession?.ended_at ?? lastSession?.started_at ?? null,
        }
      })
      .sort((a, b) => (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0))
  }),

  // ─── Benchmarking del equipo ──────────────────────────────────────────────

  getTeamBenchmark: protectedProcedure
    .input(z.object({ days: z.number().min(7).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000).toISOString()

      const { data: sessions, error } = await ctx.db
        .from('work_sessions')
        .select('user_id, started_at, ended_at, productive_seconds, active_seconds')
        .eq('tenant_id', ctx.user!.tid)
        .gte('started_at', since)
        .not('ended_at', 'is', null)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      const byUser = new Map<
        string,
        { total: number; productive: number; days: Set<string>; active: number }
      >()
      for (const s of sessions ?? []) {
        if (!byUser.has(s.user_id))
          byUser.set(s.user_id, { total: 0, productive: 0, days: new Set(), active: 0 })
        const u = byUser.get(s.user_id)!
        const dur = s.ended_at
          ? (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000
          : 0
        u.total += dur
        u.productive += s.productive_seconds ?? 0
        u.active += s.active_seconds ?? 0
        u.days.add(s.started_at.slice(0, 10))
      }

      const allUsers = Array.from(byUser.values())
      const avgProductivity =
        allUsers.length > 0
          ? (allUsers.reduce((s, u) => s + (u.total > 0 ? u.productive / u.total : 0), 0) /
              allUsers.length) *
            100
          : 0
      const avgDailyHours =
        allUsers.length > 0
          ? allUsers.reduce((s, u) => s + (u.days.size > 0 ? u.total / u.days.size / 3600 : 0), 0) /
            allUsers.length
          : 0

      const mine = byUser.get(ctx.user!.sub)
      const myProductivity = mine && mine.total > 0 ? (mine.productive / mine.total) * 100 : 0
      const myDailyHours = mine && mine.days.size > 0 ? mine.total / mine.days.size / 3600 : 0

      return {
        team_avg_productivity: Math.round(avgProductivity),
        team_avg_daily_hours: Math.round(avgDailyHours * 10) / 10,
        my_productivity: Math.round(myProductivity),
        my_daily_hours: Math.round(myDailyHours * 10) / 10,
        team_size: allUsers.length,
        days: input.days,
      }
    }),

  // ─── Facturas (Invoices) ──────────────────────────────────────────────────

  getMyInvoices: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('invoices')
      .select('*')
      .eq('employee_id', ctx.user!.sub)
      .order('created_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createInvoice: protectedProcedure
    .input(
      z.object({
        period_start: z.string(),
        period_end: z.string(),
        hours_worked: z.number().min(0),
        rate_per_hour: z.number().min(0),
        currency: z.string().default('COP'),
        tax_rate: z.number().min(0).max(100).default(0),
        notes: z.string().max(2000).optional(),
        client_name: z.string().max(200).optional(),
        client_email: z.string().email().optional().or(z.literal('')),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const subtotal = input.hours_worked * input.rate_per_hour
      const tax_amount = subtotal * (input.tax_rate / 100)
      const total_amount = subtotal + tax_amount
      const invoice_number = `INV-${Date.now().toString().slice(-8)}`

      const { data, error } = await ctx.db
        .from('invoices')
        .insert({
          tenant_id: ctx.user!.tid,
          employee_id: ctx.user!.sub,
          invoice_number,
          period_start: input.period_start,
          period_end: input.period_end,
          hours_worked: input.hours_worked,
          rate_per_hour: input.rate_per_hour,
          currency: input.currency,
          subtotal,
          tax_rate: input.tax_rate,
          tax_amount,
          total_amount,
          notes: input.notes ?? null,
          client_name: input.client_name ?? null,
          client_email: input.client_email ?? null,
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateInvoiceStatus: protectedProcedure
    .input(
      z.object({ id: z.string().uuid(), status: z.enum(['draft', 'sent', 'paid', 'cancelled']) }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('invoices')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('employee_id', ctx.user!.sub)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Declaración de ubicación (WFH / Oficina / Viaje) ────────────────────

  declareWorkLocation: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        location_type: z.enum(['home', 'office', 'travel', 'other']),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from('work_locations').upsert(
        {
          tenant_id: ctx.user!.tid,
          user_id: ctx.user!.sub,
          date: input.date,
          location_type: input.location_type,
          note: input.note ?? null,
        },
        { onConflict: 'tenant_id,user_id,date' },
      )
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getMyWorkLocations: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
      const { data, error } = await ctx.db
        .from('work_locations')
        .select('*')
        .eq('user_id', ctx.user!.sub)
        .gte('date', since)
        .order('date', { ascending: false })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  getTeamWorkLocations: protectedProcedure
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

  // ─── Kudos / Reconocimiento entre pares ──────────────────────────────────

  sendKudos: protectedProcedure
    .input(
      z.object({
        to_user_id: z.string().uuid(),
        message: z.string().min(1).max(500),
        value: z.enum([
          'teamwork',
          'innovation',
          'excellence',
          'leadership',
          'helpfulness',
          'other',
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.to_user_id === ctx.user!.sub)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No puedes enviarte kudos a ti mismo' })
      const { error } = await ctx.db.from('kudos').insert({
        tenant_id: ctx.user!.tid,
        from_user_id: ctx.user!.sub,
        to_user_id: input.to_user_id,
        message: input.message,
        value: input.value,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getKudosFeed: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
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

  getMyKudosReceived: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('kudos')
      .select('*, from_user:users!kudos_from_user_id_fkey(id, full_name)')
      .eq('to_user_id', ctx.user!.sub)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // ─── Encuestas de pulso ───────────────────────────────────────────────────

  getActiveSurveys: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date().toISOString()
    const { data: surveys, error } = await ctx.db
      .from('pulse_surveys')
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .eq('status', 'active')
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    const surveyIds = (surveys ?? []).map((s) => s.id)
    if (surveyIds.length === 0) return []

    const { data: myResponses } = await ctx.db
      .from('pulse_responses')
      .select('survey_id')
      .eq('user_id', ctx.user!.sub)
      .in('survey_id', surveyIds)

    const respondedIds = new Set((myResponses ?? []).map((r) => r.survey_id))
    return (surveys ?? []).map((s) => ({ ...s, already_responded: respondedIds.has(s.id) }))
  }),

  submitSurveyResponse: protectedProcedure
    .input(
      z.object({
        survey_id: z.string().uuid(),
        answers: z.array(z.object({ question_index: z.number(), value: z.unknown() })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from('pulse_responses').insert({
        survey_id: input.survey_id,
        tenant_id: ctx.user!.tid,
        user_id: ctx.user!.sub,
        answers:
          input.answers as unknown as import('@bcwork/db').Database['public']['Tables']['pulse_responses']['Insert']['answers'],
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Payslips / Nómina ───────────────────────────────────────────────────

  getMyPayslips: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('payslips')
      .select('*')
      .eq('employee_id', ctx.user!.sub)
      .order('period_start', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  acknowledgePayslip: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('payslips')
        .update({ status: 'acknowledged', updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('employee_id', ctx.user!.sub)
        .eq('status', 'issued')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── HR Documents ─────────────────────────────────────────────────────────

  getMyHRDocuments: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('hr_documents')
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .or(`employee_id.eq.${ctx.user!.sub},employee_id.is.null`)
      .neq('visibility', 'admin_only')
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  signDocument: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        signature_data: z.string().min(1),
        signed_name: z.string().min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('hr_documents')
        .update({
          signed_at: new Date().toISOString(),
          signature_data: input.signature_data,
          signed_name: input.signed_name,
        })
        .eq('id', input.id)
        .eq('requires_signature', true)
        .or(`employee_id.eq.${ctx.user!.sub},employee_id.is.null`)
        .eq('tenant_id', ctx.user!.tid)
        .is('signed_at', null)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Performance Reviews ──────────────────────────────────────────────────

  getMyPerformanceReviews: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('performance_reviews')
      .select(
        '*, reviewee:users!performance_reviews_reviewee_id_fkey(id, full_name, position), reviewer:users!performance_reviews_reviewer_id_fkey(id, full_name)',
      )
      .or(`reviewee_id.eq.${ctx.user!.sub},reviewer_id.eq.${ctx.user!.sub}`)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  submitReview: protectedProcedure
    .input(
      z.object({
        review_id: z.string().uuid(),
        answers: z.array(z.object({ question_index: z.number(), value: z.unknown() })),
        overall_rating: z.number().int().min(1).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      type ReviewUpdate = {
        answers: unknown
        overall_rating: number
        status: string
        submitted_at: string
      }
      const patch: ReviewUpdate = {
        answers: input.answers,
        overall_rating: input.overall_rating,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }
      const { error } = await (ctx.db as any)
        .from('performance_reviews')
        .update(patch)
        .eq('id', input.review_id)
        .eq('reviewer_id', ctx.user!.sub)
        .eq('status', 'pending')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  acknowledgeReview: protectedProcedure
    .input(z.object({ review_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('performance_reviews')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', input.review_id)
        .eq('reviewee_id', ctx.user!.sub)
        .eq('status', 'submitted')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Expenses / Gastos ────────────────────────────────────────────────────

  getMyExpenses: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('expenses')
      .select('*')
      .eq('employee_id', ctx.user!.sub)
      .order('expense_date', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  submitExpense: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        expense_date: z.string(),
        amount: z.number().positive(),
        currency: z.string().default('COP'),
        category: z.enum(['travel', 'food', 'equipment', 'software', 'training', 'other']),
        description: z.string().max(1000).optional(),
        receipt_url: z.string().url().optional().or(z.literal('')),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('expenses')
        .insert({
          tenant_id: ctx.user!.tid,
          employee_id: ctx.user!.sub,
          title: input.title,
          expense_date: input.expense_date,
          amount: input.amount,
          currency: input.currency,
          category: input.category,
          description: input.description ?? null,
          receipt_url: input.receipt_url || null,
        })
        .select()
        .single()
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  cancelExpense: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('expenses')
        .delete()
        .eq('id', input.id)
        .eq('employee_id', ctx.user!.sub)
        .eq('status', 'pending')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Org chart / Directorio ───────────────────────────────────────────────

  getOrgChart: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('users')
      .select('id, full_name, email, role, department, position, status, manager_id')
      .eq('tenant_id', ctx.user!.tid)
      .neq('status', 'deleted')
      .order('full_name')
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // ─── Onboarding ───────────────────────────────────────────────────────────

  getMyOnboardingTasks: protectedProcedure
    .input(z.object({ task_type: z.enum(['onboarding', 'offboarding']).default('onboarding') }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('onboarding_tasks')
        .select('*')
        .eq('employee_id', ctx.user!.sub)
        .eq('task_type', input.task_type)
        .order('order_index')
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  completeOnboardingTask: protectedProcedure
    .input(z.object({ id: z.string().uuid(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('onboarding_tasks')
        .update({ completed_at: input.completed ? new Date().toISOString() : null })
        .eq('id', input.id)
        .eq('employee_id', ctx.user!.sub)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Training ─────────────────────────────────────────────────────────────

  getMyTraining: protectedProcedure.query(async ({ ctx }) => {
    const { data: enrollments, error } = await ctx.db
      .from('training_enrollments')
      .select('*, training_courses(*)')
      .eq('employee_id', ctx.user!.sub)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

    const { data: required } = await ctx.db
      .from('training_courses')
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .eq('is_required', true)
    return { enrollments: enrollments ?? [], required_courses: required ?? [] }
  }),

  updateTrainingProgress: protectedProcedure
    .input(z.object({ enrollment_id: z.string().uuid(), progress_pct: z.number().min(0).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const completed = input.progress_pct === 100
      const { error } = await ctx.db
        .from('training_enrollments')
        .update({
          progress_pct: input.progress_pct,
          status: completed ? 'completed' : 'in_progress',
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', input.enrollment_id)
        .eq('employee_id', ctx.user!.sub)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Benefits ─────────────────────────────────────────────────────────────

  getMyBenefits: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('benefits')
      .select('*')
      .eq('tenant_id', ctx.user!.tid)
      .or(`employee_id.eq.${ctx.user!.sub},employee_id.is.null`)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // ─── 1:1 Meetings ─────────────────────────────────────────────────────────

  getMy1on1s: protectedProcedure
    .input(
      z.object({ status: z.enum(['scheduled', 'completed', 'cancelled', 'all']).default('all') }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('one_on_ones')
        .select('*, manager:users!one_on_ones_manager_id_fkey(id, full_name, email, position)')
        .eq('employee_id', ctx.user!.sub)
        .order('scheduled_at', { ascending: false })
      if (input.status !== 'all') q = q.eq('status', input.status)
      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // ── Certificados laborales ──────────────────────────────────────────────
  getMyCertificates: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('labor_certificates' as any)
      .select('*')
      .eq('employee_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  requestCertificate: protectedProcedure
    .input(
      z.object({
        type: z.enum(['income', 'experience', 'paz_y_salvo', 'employment', 'other']),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from('labor_certificates' as any).insert({
        employee_id: ctx.user!.sub,
        tenant_id: ctx.user!.tid,
        type: input.type,
        reason: input.reason ?? null,
        status: 'pending',
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ── Anuncios de empresa ──────────────────────────────────────────────────
  getAnnouncements: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date().toISOString()
    const { data, error } = await ctx.db
      .from('announcements' as any)
      .select('*, author:users!announcements_created_by_fkey(full_name)')
      .eq('tenant_id', ctx.user!.tid)
      .lte('published_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  // ── Calendario de empresa ────────────────────────────────────────────────
  getCompanyCalendar: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const start = `${input.year}-${String(input.month).padStart(2, '0')}-01`
      const end = new Date(input.year, input.month, 0).toISOString().slice(0, 10)
      const { data, error } = await ctx.db
        .from('company_events' as any)
        .select('*')
        .eq('tenant_id', ctx.user!.tid)
        .gte('event_date', start)
        .lte('event_date', end)
        .order('event_date', { ascending: true })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  acknowledge1on1: protectedProcedure
    .input(z.object({ id: z.string().uuid(), notes: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('one_on_ones')
        .update({ status: 'completed', notes: input.notes ?? null })
        .eq('id', input.id)
        .eq('employee_id', ctx.user!.sub)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Mis habilidades ────────────────────────────────────────────────────────

  getMySkills: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as any
    const { data } = await db
      .from('employee_skills')
      .select('*')
      .eq('user_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .order('skill_name', { ascending: true })
    return (data ?? []) as any[]
  }),

  upsertMySkill: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        skill_name: z.string().min(1).max(100),
        category: z.string().optional(),
        level: z.number().int().min(1).max(5),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as any
      if (input.id) {
        const { error } = await db
          .from('employee_skills')
          .update({
            skill_name: input.skill_name,
            category: input.category,
            level: input.level,
            notes: input.notes,
          })
          .eq('id', input.id)
          .eq('user_id', ctx.user!.sub)
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      } else {
        const { error } = await db.from('employee_skills').insert({
          tenant_id: ctx.user!.tid,
          user_id: ctx.user!.sub,
          skill_name: input.skill_name,
          category: input.category,
          level: input.level,
          notes: input.notes,
        })
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
    }),

  deleteMySkill: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as any
      await db.from('employee_skills').delete().eq('id', input.id).eq('user_id', ctx.user!.sub)
    }),

  // ─── Mi historial de compensación ──────────────────────────────────────────

  getMyCompensationHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as any
    const { data } = await db
      .from('compensation_records')
      .select('id, effective_date, salary, currency, compensation_type, notes')
      .eq('user_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .order('effective_date', { ascending: false })
    return (data ?? []) as any[]
  }),

  // ─── Solicitar feedback 360° ────────────────────────────────────────────────

  getMyFeedbackRequests: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as any
    const { data } = await db
      .from('feedback_360')
      .select(
        'id, reviewee_id, reviewer_id, status, feedback_text, request_note, created_at, requester_acknowledged',
      )
      .eq('requested_by', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })

    // enrich with reviewer names
    const reviewerIds = [...new Set((data ?? []).map((r: any) => r.reviewer_id as string))]
    const { data: users } = await db
      .from('users')
      .select('id, full_name, email, department')
      .in('id', reviewerIds.length ? reviewerIds : ['00000000-0000-0000-0000-000000000000'])
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))

    return ((data ?? []) as any[]).map((r: any) => ({
      ...r,
      reviewer: userMap.get(r.reviewer_id) ?? null,
    }))
  }),

  getMyReceivedFeedback: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as any
    const { data } = await db
      .from('feedback_360')
      .select('id, reviewer_id, feedback_text, status, created_at, request_note')
      .eq('reviewee_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    const reviewerIds = [...new Set((data ?? []).map((r: any) => r.reviewer_id as string))]
    const { data: users } = await db
      .from('users')
      .select('id, full_name, email, department')
      .in('id', reviewerIds.length ? reviewerIds : ['00000000-0000-0000-0000-000000000000'])
    const userMap = new Map((users ?? []).map((u: any) => [u.id, u]))

    return ((data ?? []) as any[]).map((r: any) => ({
      ...r,
      reviewer: userMap.get(r.reviewer_id) ?? null,
    }))
  }),

  requestFeedback: protectedProcedure
    .input(
      z.object({
        reviewer_ids: z.array(z.string().uuid()).min(1).max(10),
        request_note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as any
      const rows = input.reviewer_ids.map((rid) => ({
        tenant_id: ctx.user!.tid,
        reviewee_id: ctx.user!.sub,
        reviewer_id: rid,
        requested_by: ctx.user!.sub,
        request_note: input.request_note,
        status: 'pending',
        review_type: '360',
      }))
      const { error } = await db.from('feedback_360').insert(rows)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }),

  acknowledgeReceivedFeedback: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as any
      await db
        .from('feedback_360')
        .update({ requester_acknowledged: true })
        .eq('id', input.id)
        .eq('requested_by', ctx.user!.sub)
    }),

  getMyTeammates: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as any
    const { data: teams } = await db
      .from('team_members')
      .select('team_id')
      .eq('user_id', ctx.user!.sub)
    const teamIds = (teams ?? []).map((t: any) => t.team_id as string)
    if (!teamIds.length) return []

    const { data: members } = await db.from('team_members').select('user_id').in('team_id', teamIds)
    const memberIds = [...new Set((members ?? []).map((m: any) => m.user_id as string))].filter(
      (id) => id !== ctx.user!.sub,
    )
    if (!memberIds.length) return []

    const { data: users } = await db
      .from('users')
      .select('id, full_name, email, department, position')
      .in('id', memberIds)
      .eq('tenant_id', ctx.user!.tid)
    return (users ?? []) as any[]
  }),

  // ─── Mi plan de carrera ─────────────────────────────────────────────────────

  getMyCareerPlan: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as any
    const { data: plan } = await db
      .from('career_plans')
      .select('*')
      .eq('user_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .maybeSingle()
    if (!plan) return null

    const { data: milestones } = await db
      .from('career_milestones')
      .select('*')
      .eq('career_plan_id', plan.id)
      .order('sort_order', { ascending: true })

    return { ...plan, milestones: (milestones ?? []) as any[] }
  }),

  updateCareerPlanProgress: protectedProcedure
    .input(
      z.object({
        milestone_id: z.string().uuid(),
        status: z.enum(['pending', 'in_progress', 'completed']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as any
      // verify ownership through plan
      const { data: ms } = await db
        .from('career_milestones')
        .select('career_plan_id')
        .eq('id', input.milestone_id)
        .single()
      if (!ms) throw new TRPCError({ code: 'NOT_FOUND' })

      const { data: plan } = await db
        .from('career_plans')
        .select('id')
        .eq('id', ms.career_plan_id)
        .eq('user_id', ctx.user!.sub)
        .single()
      if (!plan) throw new TRPCError({ code: 'FORBIDDEN' })

      await db
        .from('career_milestones')
        .update({ status: input.status })
        .eq('id', input.milestone_id)
    }),

  // ─── Documentos pendientes de firma ────────────────────────────────────────

  getMyEmployeeDocuments: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as any
    const { data } = await db
      .from('employee_documents')
      .select(
        'id, title, category, file_url, notes, requires_signature, signed_at, signature_note, created_at, expiry_date',
      )
      .eq('employee_id', ctx.user!.sub)
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })
    return (data ?? []) as any[]
  }),

  signEmployeeDocument: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        signature_note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as any
      const { error } = await db
        .from('employee_documents')
        .update({
          signed_at: new Date().toISOString(),
          signature_note: input.signature_note ?? null,
        })
        .eq('id', input.id)
        .eq('employee_id', ctx.user!.sub)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    }),
})
