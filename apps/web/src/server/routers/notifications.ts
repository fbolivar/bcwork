import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '../trpc'

export const notificationsRouter = router({
  // ─── Mis notificaciones ───────────────────────────────────────────────────

  getMyNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user!.tid) return []

      let query = ctx.db
        .from('alert_notifications')
        .select(
          'id, title, body, severity, read_at, created_at, subject_user_id, users!alert_notifications_subject_user_id_fkey(full_name, email)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .eq('recipient_id', ctx.user!.sub)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      if (input.unreadOnly) {
        query = query.is('read_at', null)
      }

      const { data, error } = await query
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return (data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        severity: n.severity as 'info' | 'warning' | 'critical',
        read_at: n.read_at,
        created_at: n.created_at,
        subject_name:
          (n.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
      }))
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user!.tid) return { count: 0 }

    const { count, error } = await ctx.db
      .from('alert_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', ctx.user!.tid)
      .eq('recipient_id', ctx.user!.sub)
      .is('read_at', null)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { count: count ?? 0 }
  }),

  markAsRead: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('alert_notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', input.ids)
        .eq('tenant_id', ctx.user!.tid)
        .eq('recipient_id', ctx.user!.sub)
        .is('read_at', null)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.db
      .from('alert_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('tenant_id', ctx.user!.tid)
      .eq('recipient_id', ctx.user!.sub)
      .is('read_at', null)

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return { ok: true }
  }),

  // ─── Reglas de alerta (admin) ─────────────────────────────────────────────

  listAlertRules: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('alert_rules')
      .select(
        'id, name, rule_type, threshold_value, consecutive_days, scope, scope_id, notify_manager, notify_admin, is_active, created_at',
      )
      .eq('tenant_id', ctx.user!.tid)
      .order('created_at', { ascending: false })

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
  }),

  createAlertRule: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        rule_type: z.enum(['low_productivity', 'overtime', 'inactivity', 'high_non_productive']),
        threshold_value: z.number().min(0).max(9999),
        consecutive_days: z.number().int().min(1).max(30).default(1),
        scope: z.enum(['all', 'team', 'user']).default('all'),
        scope_id: z.string().uuid().optional(),
        notify_manager: z.boolean().default(true),
        notify_admin: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from('alert_rules')
        .insert({
          tenant_id: ctx.user!.tid,
          created_by: ctx.user!.sub,
          name: input.name,
          rule_type: input.rule_type,
          threshold_value: input.threshold_value,
          consecutive_days: input.consecutive_days,
          scope: input.scope,
          scope_id: input.scope_id ?? null,
          notify_manager: input.notify_manager,
          notify_admin: input.notify_admin,
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateAlertRule: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        threshold_value: z.number().min(0).max(9999).optional(),
        consecutive_days: z.number().int().min(1).max(30).optional(),
        notify_manager: z.boolean().optional(),
        notify_admin: z.boolean().optional(),
        is_active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input
      const { error } = await ctx.db
        .from('alert_rules')
        .update(fields)
        .eq('id', id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  deleteAlertRule: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('alert_rules')
        .delete()
        .eq('id', input.id)
        .eq('tenant_id', ctx.user!.tid)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  triggerAlertEvaluation: adminProcedure
    .input(
      z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const p_date = input.date ?? new Date().toISOString().slice(0, 10)
      const { data, error } = await ctx.db.rpc('evaluate_alerts', {
        p_date,
        p_tenant_id: ctx.user!.tid,
      })
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { notifications_created: data as number }
    }),
})
