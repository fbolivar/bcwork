import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { dispatchWebhook } from '@/lib/webhooks'

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
      p_tenant_id: null,
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
    p_tenant_id: null,
  })

  let notifications = 0
  if (alertError) {
    console.error('[cron] evaluate_alerts failed:', alertError.message)
  } else {
    notifications = alertData as number
    console.log(`[cron] evaluate_alerts created ${notifications} notifications`)

    // Disparar webhooks de alerta si se generaron notificaciones
    if (notifications > 0) {
      const { data: tenants } = await db.from('tenants').select('id').eq('status', 'active')
      await Promise.allSettled(
        (tenants ?? []).map((t) =>
          dispatchWebhook(t.id, 'alert.fired', { date, notifications_count: notifications }),
        ),
      )
    }
  }

  return NextResponse.json({ ok: true, date, rows, notifications })
}
