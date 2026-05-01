import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { dispatchWebhook } from '@/lib/webhooks'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const dateParam = req.nextUrl.searchParams.get('date')
  const date = dateParam ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const db = getDb()

  const { data, error } = await db.rpc('aggregate_daily_user_metrics', {
    p_date: date,
    p_tenant_id: null,
  })

  if (error) {
    console.error('[cron] aggregate_daily_user_metrics failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const result = data as Array<{ rows_upserted: number }>
  const rows = result.reduce((s, r) => s + (r.rows_upserted ?? 0), 0)
  console.log(`[cron] aggregated ${rows} user-day records for ${date}`)

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
