import { z } from 'zod'
import { createHash } from 'crypto'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { hashPassword, verifyPassword, validatePasswordPolicy } from '@/lib/auth/password'

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
        'effective_from, effective_to, work_schedules(name, weekly_hours, start_time, end_time, days_of_week, break_minutes, disconnection_grace_minutes)',
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
    .input(z.object({ page: z.number().int().min(0).default(0) }))
    .query(async ({ ctx, input }) => {
      const PAGE_SIZE = 20
      const from = new Date(Date.now() - 30 * 86400000).toISOString()

      const { data, error, count } = await ctx.db
        .from('work_sessions')
        .select('id, started_at, ended_at, active_seconds, idle_seconds, location_type, status', {
          count: 'exact',
        })
        .eq('tenant_id', ctx.user!.tid)
        .eq('user_id', ctx.user!.sub)
        .gte('started_at', from)
        .order('started_at', { ascending: false })
        .range(input.page * PAGE_SIZE, (input.page + 1) * PAGE_SIZE - 1)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { sessions: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE }
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
      return { ok: true }
    }),

  // ─── Ver mis solicitudes de corrección ───────────────────────────────────

  getMyActivityEdits: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('activity_edits')
      .select('id, applies_to_date, edit_type, reason, status, created_at, reviewed_at')
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

      // Fire-and-forget — un fallo de auditoría no debe bloquear el consentimiento
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
})
