import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure, requireRole } from '../trpc'

const managerProcedure = protectedProcedure.use(requireRole('tenant_admin', 'manager'))

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

      let alertQuery = ctx.db
        .from('alert_notifications')
        .select(
          'id, title, body, severity, read_at, created_at, subject_user_id, users!alert_notifications_subject_user_id_fkey(full_name, email)',
        )
        .eq('tenant_id', ctx.user!.tid)
        .eq('recipient_id', ctx.user!.sub)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      let msgQuery = ctx.db
        .from('notifications')
        .select('id, title, body, read_at, created_at')
        .eq('tenant_id', ctx.user!.tid)
        .eq('user_id', ctx.user!.sub)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      if (input.unreadOnly) {
        alertQuery = alertQuery.is('read_at', null)
        msgQuery = msgQuery.is('read_at', null)
      }

      const [alertRes, msgRes] = await Promise.all([alertQuery, msgQuery])
      if (alertRes.error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: alertRes.error.message })
      if (msgRes.error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msgRes.error.message })

      const alerts = (alertRes.data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        severity: (n.severity ?? 'info') as 'info' | 'warning' | 'critical',
        read_at: n.read_at,
        created_at: n.created_at ?? '',
        subject_name:
          (n.users as unknown as { full_name: string | null } | null)?.full_name ?? null,
        source: 'alert' as const,
      }))

      const messages = (msgRes.data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        severity: 'info' as const,
        read_at: n.read_at,
        created_at: n.created_at ?? '',
        subject_name: null,
        source: 'manager' as const,
      }))

      return [...alerts, ...messages]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, input.limit)
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user!.tid) return { count: 0 }

    const [alertRes, msgRes] = await Promise.all([
      ctx.db
        .from('alert_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', ctx.user!.tid)
        .eq('recipient_id', ctx.user!.sub)
        .is('read_at', null),
      ctx.db
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', ctx.user!.tid)
        .eq('user_id', ctx.user!.sub)
        .is('read_at', null),
    ])

    if (alertRes.error)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: alertRes.error.message })
    if (msgRes.error)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msgRes.error.message })

    return { count: (alertRes.count ?? 0) + (msgRes.count ?? 0) }
  }),

  markAsRead: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString()
      await Promise.all([
        ctx.db
          .from('alert_notifications')
          .update({ read_at: now })
          .in('id', input.ids)
          .eq('tenant_id', ctx.user!.tid)
          .eq('recipient_id', ctx.user!.sub)
          .is('read_at', null),
        ctx.db
          .from('notifications')
          .update({ read_at: now })
          .in('id', input.ids)
          .eq('tenant_id', ctx.user!.tid)
          .eq('user_id', ctx.user!.sub)
          .is('read_at', null),
      ])
      return { ok: true }
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date().toISOString()
    await Promise.all([
      ctx.db
        .from('alert_notifications')
        .update({ read_at: now })
        .eq('tenant_id', ctx.user!.tid)
        .eq('recipient_id', ctx.user!.sub)
        .is('read_at', null),
      ctx.db
        .from('notifications')
        .update({ read_at: now })
        .eq('tenant_id', ctx.user!.tid)
        .eq('user_id', ctx.user!.sub)
        .is('read_at', null),
    ])
    return { ok: true }
  }),

  // ─── Manager envía notificación a empleado(s) ─────────────────────────────

  sendNotification: managerProcedure
    .input(
      z.object({
        userIds: z.array(z.string().uuid()).min(1).max(50),
        title: z.string().min(1).max(200),
        body: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rows = input.userIds.map((uid) => ({
        tenant_id: ctx.user!.tid,
        user_id: uid,
        channel: 'manager_message',
        title: input.title,
        body: input.body ?? null,
      }))

      const { error } = await ctx.db.from('notifications').insert(rows)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true, sent: rows.length }
    }),

  // ─── Manager lista sus empleados del tenant para enviar notificaciones ─────

  getTenantMembers: managerProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from('users')
      .select('id, full_name, email, department, position, status')
      .eq('tenant_id', ctx.user!.tid)
      .in('role', ['employee', 'manager'])
      .eq('status', 'active')
      .order('full_name')

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
    return data ?? []
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
