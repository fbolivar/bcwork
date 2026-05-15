import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, platformAdminProcedure } from '../trpc'
import crypto from 'crypto'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `BCW-${year}${month}-${rand}`
}

function generateWompiReference(tenantId: string): string {
  const ts = Date.now()
  const short = tenantId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `BCW-${short}-${ts}`
}

// Wompi checkout URL builder
// Docs: https://docs.wompi.co/docs/colombia/widget-checkout
function buildWompiCheckoutUrl(params: {
  publicKey: string
  reference: string
  amountCop: number // in cents (COP * 100)
  redirectUrl: string
  customerEmail: string
  integritySecret: string
}): string {
  const { publicKey, reference, amountCop, redirectUrl, customerEmail, integritySecret } = params

  // Wompi integrity signature: SHA256(reference + amountCents + currency + integritySecret)
  const signatureString = `${reference}${amountCop}COP${integritySecret}`
  const signature = crypto.createHash('sha256').update(signatureString).digest('hex')

  const url = new URL('https://checkout.wompi.co/p/')
  url.searchParams.set('public-key', publicKey)
  url.searchParams.set('currency', 'COP')
  url.searchParams.set('amount-in-cents', String(amountCop))
  url.searchParams.set('reference', reference)
  url.searchParams.set('redirect-url', redirectUrl)
  url.searchParams.set('customer-email', customerEmail)
  url.searchParams.set('signature:integrity', signature)

  return url.toString()
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const billingRouter = router({
  // ─── ADMIN (tenant) ────────────────────────────────────────────────────────

  // Lista las facturas de facturación del tenant
  listInvoices: adminProcedure
    .input(
      z.object({
        status: z.enum(['all', 'pending', 'paid', 'overdue', 'cancelled']).default('all'),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('billing_invoices')
        .select('*')
        .eq('tenant_id', ctx.user!.tid)
        .order('created_at', { ascending: false })
        .limit(50)

      if (input.status !== 'all') q = q.eq('status', input.status)

      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // Genera URL de checkout Wompi para pagar una factura
  createWompiCheckout: adminProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: invoice, error } = await ctx.db
        .from('billing_invoices')
        .select('*')
        .eq('id', input.invoiceId)
        .eq('tenant_id', ctx.user!.tid)
        .eq('status', 'pending')
        .single()

      if (error || !invoice)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Factura no encontrada o ya pagada' })

      const publicKey = process.env.WOMPI_PUBLIC_KEY
      const integritySecret = process.env.WOMPI_INTEGRITY_SECRET
      if (!publicKey || !integritySecret)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Wompi no configurado' })

      // Get tenant contact email
      const { data: tenant } = await ctx.db
        .from('tenants')
        .select('contact_email')
        .eq('id', ctx.user!.tid)
        .single()

      const reference = generateWompiReference(ctx.user!.tid)
      const amountCents = invoice.total_cop * 100 // COP to cents
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.bcwork.co'
      const redirectUrl = `${appUrl}/admin/billing?payment=complete`

      // Store pending transaction
      await ctx.db.from('wompi_transactions').insert({
        tenant_id: ctx.user!.tid,
        billing_invoice_id: invoice.id,
        reference,
        amount_cop: invoice.total_cop,
        status: 'pending',
        redirect_url: redirectUrl,
      })

      const checkoutUrl = buildWompiCheckoutUrl({
        publicKey,
        reference,
        amountCop: amountCents,
        redirectUrl,
        customerEmail: tenant?.contact_email ?? '',
        integritySecret,
      })

      return { checkoutUrl, reference }
    }),

  // ─── PLATFORM ADMIN (super-admin) ─────────────────────────────────────────

  // Lista todas las facturas de billing (todos los tenants)
  listAllInvoices: platformAdminProcedure
    .input(
      z.object({
        status: z.enum(['all', 'pending', 'paid', 'overdue', 'cancelled']).default('all'),
        tenantId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from('billing_invoices')
        .select(
          '*, tenants!billing_invoices_tenant_id_fkey(id, legal_name, trade_name, contact_email)',
        )
        .order('created_at', { ascending: false })
        .limit(input.limit)

      if (input.status !== 'all') q = q.eq('status', input.status)
      if (input.tenantId) q = q.eq('tenant_id', input.tenantId)

      const { data, error } = await q
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data ?? []
    }),

  // Crea una factura manual para un tenant
  createInvoice: platformAdminProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        planCode: z.string(),
        planName: z.string(),
        seats: z.number().int().min(1),
        unitPriceCop: z.number().int().min(1),
        taxPct: z.number().min(0).max(100).default(0),
        periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(500).optional(),
        licenseId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const subtotal = input.seats * input.unitPriceCop
      const tax = Math.round(subtotal * (input.taxPct / 100))
      const total = subtotal + tax

      const invoiceNumber = generateInvoiceNumber()

      const { data, error } = await ctx.db
        .from('billing_invoices')
        .insert({
          tenant_id: input.tenantId,
          invoice_number: invoiceNumber,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          plan_code: input.planCode,
          plan_name: input.planName,
          seats: input.seats,
          unit_price_cop: input.unitPriceCop,
          subtotal_cop: subtotal,
          tax_cop: tax,
          total_cop: total,
          due_date: input.dueDate,
          notes: input.notes ?? null,
          license_id: input.licenseId ?? null,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Log billing event
      await ctx.db.from('billing_events').insert({
        tenant_id: input.tenantId,
        event_type: 'invoice_created',
        amount_cop: total,
        metadata: { invoice_number: invoiceNumber, plan: input.planCode },
      })

      return data
    }),

  // Marca una factura como pagada (cobro manual) y extiende la licencia
  markInvoicePaid: platformAdminProcedure
    .input(
      z.object({
        invoiceId: z.string().uuid(),
        paymentMethod: z.enum(['manual', 'transfer', 'wompi', 'other']).default('manual'),
        paymentReference: z.string().max(200).optional(),
        notes: z.string().max(500).optional(),
        extendMonths: z.number().int().min(1).max(12).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: invoice, error: invErr } = await ctx.db
        .from('billing_invoices')
        .select('*')
        .eq('id', input.invoiceId)
        .single()

      if (invErr || !invoice)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Factura no encontrada' })

      if (invoice.status === 'paid')
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Factura ya está pagada' })

      // Update invoice
      const { error: updateErr } = await ctx.db
        .from('billing_invoices')
        .update({
          status: 'paid',
          payment_method: input.paymentMethod,
          payment_reference: input.paymentReference ?? null,
          paid_at: new Date().toISOString(),
          paid_by: ctx.user!.sub,
          notes: input.notes ?? invoice.notes,
        })
        .eq('id', input.invoiceId)

      if (updateErr)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateErr.message })

      // Extend license
      if (invoice.license_id) {
        const { data: lic } = await ctx.db
          .from('licenses')
          .select('ends_at, status')
          .eq('id', invoice.license_id)
          .single()

        if (lic) {
          const base = lic.ends_at ? new Date(lic.ends_at) : new Date()
          if (base < new Date()) base.setTime(Date.now()) // if expired, extend from now
          base.setMonth(base.getMonth() + input.extendMonths)

          await ctx.db
            .from('licenses')
            .update({ status: 'active', ends_at: base.toISOString() })
            .eq('id', invoice.license_id)
        }
      }

      // Log billing event
      await ctx.db.from('billing_events').insert({
        tenant_id: invoice.tenant_id,
        event_type: 'payment_received',
        amount_cop: invoice.total_cop,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          method: input.paymentMethod,
        },
      })

      // Notify tenant admin
      const { data: adminUser } = await ctx.db
        .from('users')
        .select('id')
        .eq('tenant_id', invoice.tenant_id)
        .eq('role', 'tenant_admin')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (adminUser) {
        await (ctx.db as unknown as import('@supabase/supabase-js').SupabaseClient)
          .from('notifications')
          .insert({
            tenant_id: invoice.tenant_id,
            user_id: adminUser.id,
            type: 'payment_received',
            title: 'Pago confirmado',
            message: `Tu factura ${invoice.invoice_number} por $${invoice.total_cop.toLocaleString('es-CO')} ha sido confirmada.`,
            link: '/admin/billing',
            is_read: false,
          })
      }

      return { ok: true }
    }),

  // Cancela una factura (solo si está pendiente)
  cancelInvoice: platformAdminProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from('billing_invoices')
        .update({ status: 'cancelled' })
        .eq('id', input.invoiceId)
        .eq('status', 'pending')

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { ok: true }
    }),

  // Resumen de billing para el super-admin dashboard
  getBillingSummary: platformAdminProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.db
      .from('billing_invoices')
      .select('status, total_cop, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    const invoices = data ?? []
    const pending = invoices.filter((i) => i.status === 'pending')
    const paid = invoices.filter((i) => i.status === 'paid')
    const overdue = invoices.filter((i) => i.status === 'overdue')

    const sumCop = (arr: typeof invoices) => arr.reduce((acc, i) => acc + Number(i.total_cop), 0)

    return {
      pendingCount: pending.length,
      pendingCop: sumCop(pending),
      paidCount: paid.length,
      paidCop: sumCop(paid),
      overdueCount: overdue.length,
      overdueCop: sumCop(overdue),
    }
  }),
})
