import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure } from '../trpc'
import { generateApiToken } from '@/lib/api-auth'

const AVAILABLE_SCOPES = ['payroll:read', 'users:read', 'metrics:read', 'sessions:read'] as const

export const integrationsRouter = router({
  // ─── API Tokens ────────────────────────────────────────────────────────────

  listApiTokens: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('api_tokens')
      .select('id, name, scopes, last_used_at, expires_at, revoked_at, created_at')
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createApiToken: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        scopes: z.array(z.enum(AVAILABLE_SCOPES)).min(1),
        expires_days: z.number().int().min(1).max(3650).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { raw, hash } = generateApiToken()
      const expires_at = input.expires_days
        ? new Date(Date.now() + input.expires_days * 86400000).toISOString()
        : null

      const { data, error } = await ctx.db
        .from('api_tokens')
        .insert({
          tenant_id: ctx.user!.tid,
          created_by: ctx.user!.sub,
          name: input.name,
          token_hash: hash,
          scopes: input.scopes,
          expires_at,
        })
        .select('id, name, scopes, expires_at, created_at')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ...data, raw_token: raw }
    }),

  revokeApiToken: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('api_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // ─── Webhooks ──────────────────────────────────────────────────────────────

  listWebhooks: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('webhooks')
      .select('id, name, url, events, is_active, last_called_at, last_status_code, created_at')
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createWebhook: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        url: z.string().url(),
        secret: z.string().min(8).max(128).optional(),
        events: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('webhooks')
        .insert({
          tenant_id: ctx.user!.tid,
          created_by: ctx.user!.sub,
          name: input.name,
          url: input.url,
          secret: input.secret ?? null,
          events: input.events,
        })
        .select('id, name, url, events, is_active, created_at')
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateWebhook: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        is_active: z.boolean().optional(),
        url: z.string().url().optional(),
        events: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input
      const { error } = await ctx.db
        .from('webhooks')
        .update(fields)
        .eq('id', id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteWebhook: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('webhooks')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  getWebhookDeliveries: adminProcedure
    .input(
      z.object({
        webhookId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('webhook_deliveries')
        .select('id, event, status_code, error, created_at')
        .eq('webhook_id', input.webhookId)
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  testWebhook: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: hook, error } = await ctx.db
        .from('webhooks')
        .select('url, secret')
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .single()

      if (error || !hook)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook no encontrado' })

      const { dispatchWebhook } = await import('@/lib/webhooks')
      await dispatchWebhook(ctx.user!.tid, 'test', {
        message: 'BCWork webhook test',
        timestamp: new Date().toISOString(),
      })
      return { ok: true }
    }),

  // ─── Test genérico de integración por tipo ────────────────────────────────
  testIntegration: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: integration, error } = await ctx.db
        .from('integrations')
        .select('type, config, active')
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .single()

      if (error || !integration)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Integración no encontrada' })

      const config = integration.config as Record<string, string>

      try {
        if (integration.type === 'teams') {
          const { sendTeamsNotification } = await import('@/lib/integrations/teams')
          await sendTeamsNotification(
            config.webhook_url!,
            'BCWork — Prueba de conexión',
            'Esta es una notificación de prueba enviada desde BCWork.',
          )
        } else if (integration.type === 'whatsapp') {
          const { sendWhatsAppMessage } = await import('@/lib/integrations/whatsapp')
          await sendWhatsAppMessage(
            config.phone_number_id!,
            config.access_token!,
            config.to_phone!,
            'BCWork: Notificación de prueba ✓',
          )
        } else if (integration.type === 'google_calendar') {
          const { fetchGCalEvents } = await import('@/lib/integrations/google-calendar')
          const events = await fetchGCalEvents(config.calendar_id!, config.api_key!, 7)
          return { ok: true, detail: `${events.length} eventos encontrados en los próximos 7 días` }
        } else if (integration.type === 'slack') {
          const res = await fetch(config.webhook_url!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'BCWork: Notificación de prueba ✓' }),
          })
          if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`)
        }
      } catch (e) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: e instanceof Error ? e.message : 'Error al probar integración',
        })
      }

      return { ok: true, detail: 'Enviado correctamente' }
    }),

  // ─── Sync manual de Google Calendar ──────────────────────────────────────
  syncGoogleCalendar: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: integration, error } = await ctx.db
        .from('integrations')
        .select('config')
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)
        .eq('type', 'google_calendar')
        .single()

      if (error || !integration)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Integración no encontrada' })

      const config = integration.config as { calendar_id: string; api_key: string }
      const { fetchGCalEvents, isAllDayEvent, getEventDates, daysBetween } =
        await import('@/lib/integrations/google-calendar')

      let events
      try {
        events = await fetchGCalEvents(config.calendar_id, config.api_key)
      } catch (e) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: e instanceof Error ? e.message : 'Error al conectar con Google Calendar',
        })
      }

      const allDay = events.filter(isAllDayEvent)
      const { data: users } = await ctx.db
        .from('users')
        .select('id, email')
        .eq('tenant_id', ctx.user!.tid)
        .eq('status', 'active')

      const emailToUserId = new Map((users ?? []).map((u) => [u.email as string, u.id as string]))
      let created = 0

      for (const event of allDay) {
        const dates = getEventDates(event)
        if (!dates) continue

        const attendeeIds = (event.attendees ?? [])
          .map((a) => emailToUserId.get(a.email))
          .filter(Boolean) as string[]

        if (attendeeIds.length === 0) continue

        for (const userId of attendeeIds) {
          const { data: existing } = await ctx.db
            .from('absence_requests')
            .select('id')
            .eq('tenant_id', ctx.user!.tid)
            .eq('employee_id', userId)
            .eq('start_date', dates.start)
            .eq('type', 'gcal_import')
            .maybeSingle()

          if (!existing) {
            await ctx.db.from('absence_requests').insert({
              tenant_id: ctx.user!.tid,
              employee_id: userId,
              type: 'gcal_import',
              start_date: dates.start,
              end_date: dates.end,
              days_count: daysBetween(dates.start, dates.end),
              reason: event.summary ?? 'Importado de Google Calendar',
              status: 'approved',
              reviewed_at: new Date().toISOString(),
            })
            created++
          }
        }
      }

      return { ok: true, events_found: allDay.length, absences_created: created }
    }),
})
