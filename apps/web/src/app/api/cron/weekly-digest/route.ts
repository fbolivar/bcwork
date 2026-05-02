import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { getDb } from '@/lib/db'
import { WeeklyDigest } from '@/emails/WeeklyDigest'

export async function GET(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const now = new Date()
  const toDate = new Date(now.getTime() - 86400000) // ayer
  const fromDate = new Date(toDate.getTime() - 6 * 86400000) // hace 7 días
  const from = fromDate.toISOString().slice(0, 10)
  const to = toDate.toISOString().slice(0, 10)

  // Obtener todos los tenants activos
  const { data: tenants, error: tenantsError } = await db
    .from('tenants')
    .select('id, legal_name, trade_name')
    .eq('status', 'active')

  if (tenantsError) {
    console.error('[cron/weekly-digest] tenants error:', tenantsError.message)
    return NextResponse.json({ error: tenantsError.message }, { status: 500 })
  }

  let emailsSent = 0

  for (const tenant of tenants ?? []) {
    // Obtener digest de la semana
    const { data: digestRows, error: digestError } = await db.rpc('get_weekly_digest', {
      p_tenant_id: tenant.id,
      p_from: from,
      p_to: to,
    })

    if (digestError || !digestRows || (digestRows as unknown[]).length === 0) continue

    // Obtener admins y managers del tenant para enviarles el resumen
    const { data: recipients } = await db
      .from('users')
      .select('id, full_name, email')
      .eq('tenant_id', tenant.id)
      .in('role', ['tenant_admin', 'manager'])
      .eq('status', 'active')

    if (!recipients || recipients.length === 0) continue

    const users = digestRows as Array<{
      user_id: string
      full_name: string | null
      email: string
      total_active_seconds: number
      total_productive_secs: number
      avg_productivity: number
      days_active: number
      total_overtime_secs: number
    }>

    for (const recipient of recipients) {
      const html = await render(
        WeeklyDigest({
          tenantName: tenant.trade_name ?? tenant.legal_name,
          fromDate: from,
          toDate: to,
          users,
          recipientName: recipient.full_name ?? recipient.email,
        }),
      )

      const { error: sendError } = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? 'BCWork <no-reply@bcwork.co>',
        to: recipient.email,
        subject: `Resumen semanal BCWork · ${tenant.trade_name ?? tenant.legal_name} (${from} al ${to})`,
        html,
      })

      if (sendError) {
        console.error(`[cron/weekly-digest] send failed to ${recipient.email}:`, sendError)
      } else {
        emailsSent++
      }
    }
  }

  console.log(`[cron/weekly-digest] sent ${emailsSent} emails for week ${from}–${to}`)
  return NextResponse.json({ ok: true, from, to, emails_sent: emailsSent })
}
