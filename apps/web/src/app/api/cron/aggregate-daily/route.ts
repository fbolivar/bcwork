import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const dateParam = req.nextUrl.searchParams.get('date')
  const date = dateParam ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10) // ayer

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
  const total = result.reduce((s, r) => s + (r.rows_upserted ?? 0), 0)

  console.log(`[cron] aggregated ${total} user-day records for ${date}`)
  return NextResponse.json({ ok: true, date, rows: total })
}
