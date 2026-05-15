import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { dispatchWebhook } from '@/lib/webhooks'
import { sendTeamsNotification } from '@/lib/integrations/teams'
import { sendWhatsAppMessage } from '@/lib/integrations/whatsapp'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const dateParam = req.nextUrl.searchParams.get('date')
  // Si se especifica fecha usa solo esa, sino agrega ayer + hoy
  const dates = dateParam ? [dateParam] : [yesterday, today]

  const db = getDb()

  let rows = 0
  for (const date of dates) {
    const { data, error } = await db.rpc('aggregate_daily_user_metrics', {
      p_date: date,
    })
    if (error) {
      console.error(`[cron] aggregate_daily_user_metrics failed for ${date}:`, error.message)
      continue
    }
    const result = data as Array<{ rows_upserted: number }>
    rows += result.reduce((s, r) => s + (r.rows_upserted ?? 0), 0)
  }
  const date = dates[dates.length - 1]!
  console.log(`[cron] aggregated ${rows} user-day records for ${dates.join(', ')}`)

  const { data: alertData, error: alertError } = await db.rpc('evaluate_alerts', {
    p_date: date,
  })

  let notifications = 0
  if (alertError) {
    console.error('[cron] evaluate_alerts failed:', alertError.message)
  } else {
    notifications = alertData as number
    console.log(`[cron] evaluate_alerts created ${notifications} notifications`)

    // Disparar webhooks, Teams y WhatsApp si se generaron notificaciones
    if (notifications > 0) {
      const { data: tenants } = await db.from('tenants').select('id').eq('status', 'active')
      await Promise.allSettled(
        (tenants ?? []).map((t) =>
          dispatchWebhook(t.id, 'alert.fired', { date, notifications_count: notifications }),
        ),
      )

      const [{ data: teamsRows }, { data: waRows }] = await Promise.all([
        db.from('integrations').select('config').eq('type', 'teams').eq('active', true),
        db.from('integrations').select('config').eq('type', 'whatsapp').eq('active', true),
      ])

      const msg = `Se generaron ${notifications} alerta(s) para el ${date}. Revisa el panel BCWork.`
      await Promise.allSettled([
        ...(teamsRows ?? []).map((r) => {
          const c = r.config as { webhook_url?: string }
          return c.webhook_url
            ? sendTeamsNotification(c.webhook_url, 'BCWork — Alertas disparadas', msg)
            : Promise.resolve()
        }),
        ...(waRows ?? []).map((r) => {
          const c = r.config as {
            phone_number_id?: string
            access_token?: string
            to_phone?: string
          }
          return c.phone_number_id && c.access_token && c.to_phone
            ? sendWhatsAppMessage(c.phone_number_id, c.access_token, c.to_phone, `BCWork: ${msg}`)
            : Promise.resolve()
        }),
      ])
    }
  }

  return NextResponse.json({ ok: true, date, rows, notifications })
}
