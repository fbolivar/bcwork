import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'crypto'
import { getDb } from '@/lib/db'

// Wompi sends a checksum to verify event authenticity:
// SHA256( event.id + event.occurred_at + event.data.transaction.id + eventsSecret )
function verifyWompiSignature(body: WompiEvent, eventsSecret: string): boolean {
  const { id, occurred_at, signature, data } = body
  const transactionId = data?.transaction?.id ?? ''
  const raw = `${id}${occurred_at}${transactionId}${eventsSecret}`
  const computed = crypto.createHash('sha256').update(raw).digest('hex')
  return computed === signature?.checksum
}

interface WompiEvent {
  id: string
  occurred_at: string
  sent_at: string
  environment: string
  type: string
  signature?: { properties: string[]; checksum: string }
  data: {
    transaction?: {
      id: string
      created_at: string
      finalized_at: string
      amount_in_cents: number
      reference: string
      status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING'
      payment_method_type: string
      currency: string
      customer_email: string
    }
  }
}

export async function POST(req: NextRequest) {
  let body: WompiEvent
  try {
    body = (await req.json()) as WompiEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventsSecret = process.env.WOMPI_EVENTS_SECRET
  if (!eventsSecret) {
    return NextResponse.json({ error: 'Wompi not configured' }, { status: 500 })
  }

  // Verify signature in production
  if (process.env.NODE_ENV === 'production' && !verifyWompiSignature(body, eventsSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (body.type !== 'transaction.updated') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const txn = body.data?.transaction
  if (!txn) return NextResponse.json({ ok: true })

  const db = getDb()
  const wompiStatus = txn.status.toLowerCase() as
    | 'approved'
    | 'declined'
    | 'voided'
    | 'error'
    | 'pending'

  // Update wompi_transaction record
  const { data: record } = await db
    .from('wompi_transactions')
    .update({
      wompi_id: txn.id,
      status: wompiStatus,
      payment_method_type: txn.payment_method_type,
      webhook_payload: body as unknown as Record<string, unknown>,
    })
    .eq('reference', txn.reference)
    .select('id, tenant_id, billing_invoice_id')
    .maybeSingle()

  if (!record) {
    // Unknown reference — log and ignore
    console.warn('[wompi-webhook] Unknown reference:', txn.reference)
    return NextResponse.json({ ok: true })
  }

  if (txn.status === 'APPROVED') {
    // Mark invoice as paid
    if (record.billing_invoice_id) {
      const { data: invoice } = await db
        .from('billing_invoices')
        .update({
          status: 'paid',
          payment_method: 'wompi',
          payment_reference: txn.reference,
          paid_at: new Date().toISOString(),
        })
        .eq('id', record.billing_invoice_id)
        .select('invoice_number, total_cop, license_id')
        .maybeSingle()

      // Extend license
      if (invoice?.license_id) {
        const { data: lic } = await db
          .from('licenses')
          .select('ends_at')
          .eq('id', invoice.license_id)
          .single()

        if (lic) {
          const base = lic.ends_at ? new Date(lic.ends_at) : new Date()
          if (base < new Date()) base.setTime(Date.now())
          base.setMonth(base.getMonth() + 1)
          await db
            .from('licenses')
            .update({ status: 'active', ends_at: base.toISOString() })
            .eq('id', invoice.license_id)
        }
      }

      // Log billing event
      await db.from('billing_events').insert({
        tenant_id: record.tenant_id,
        event_type: 'payment_received',
        amount_cop: Math.round(txn.amount_in_cents / 100),
        metadata: {
          wompi_id: txn.id,
          reference: txn.reference,
          invoice_number: invoice?.invoice_number,
          method: txn.payment_method_type,
        },
      })

      // Notify tenant admin
      const { data: admin } = await db
        .from('users')
        .select('id')
        .eq('tenant_id', record.tenant_id)
        .eq('role', 'tenant_admin')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (admin) {
        await (db as unknown as import('@supabase/supabase-js').SupabaseClient)
          .from('notifications')
          .insert({
            tenant_id: record.tenant_id,
            user_id: admin.id,
            type: 'payment_received',
            title: '¡Pago recibido! ✓',
            message: `Tu pago de $${Math.round(txn.amount_in_cents / 100).toLocaleString('es-CO')} COP fue aprobado.`,
            link: '/admin/billing',
            is_read: false,
          })
      }
    }
  } else if (txn.status === 'DECLINED' || txn.status === 'ERROR') {
    await db.from('billing_events').insert({
      tenant_id: record.tenant_id,
      event_type: 'payment_failed',
      amount_cop: Math.round(txn.amount_in_cents / 100),
      metadata: { wompi_id: txn.id, reference: txn.reference, status: txn.status },
    })
  }

  return NextResponse.json({ ok: true })
}
