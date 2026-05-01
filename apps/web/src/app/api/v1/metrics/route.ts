import { NextRequest, NextResponse } from 'next/server'
import { verifyApiToken, requireScope } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

/**
 * GET /api/v1/metrics
 *
 * Resumen de productividad del tenant por período. Scope requerido: metrics:read
 *
 * Query params:
 *   from      YYYY-MM-DD (requerido)
 *   to        YYYY-MM-DD (requerido)
 *   userId    uuid (opcional)
 *   groupBy   day|user (default: user)
 */
export async function GET(req: NextRequest) {
  const token = await verifyApiToken(req.headers.get('authorization'))
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireScope(token, 'metrics:read'))
    return NextResponse.json(
      { error: 'Insufficient scope — required: metrics:read' },
      { status: 403 },
    )

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const userId = searchParams.get('userId')
  const groupBy = searchParams.get('groupBy') ?? 'user'

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json(
      { error: 'Params from and to are required (YYYY-MM-DD)' },
      { status: 400 },
    )
  }

  const db = getDb()

  let query = db
    .from('daily_user_metrics')
    .select(
      'user_id, metric_date, active_seconds, productive_seconds, non_productive_seconds, productivity_ratio, focus_score, overtime_seconds, location_type',
    )
    .eq('tenant_id', token.tenantId)
    .gte('metric_date', from)
    .lte('metric_date', to)

  if (userId) query = query.eq('user_id', userId)

  const { data: metrics, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (groupBy === 'day') {
    const byDay = new Map<
      string,
      { active: number; productive: number; overtime: number; users: Set<string> }
    >()
    for (const m of metrics ?? []) {
      const d = m.metric_date ?? ''
      const rec = byDay.get(d) ?? { active: 0, productive: 0, overtime: 0, users: new Set() }
      rec.active += m.active_seconds ?? 0
      rec.productive += m.productive_seconds ?? 0
      rec.overtime += m.overtime_seconds ?? 0
      rec.users.add(m.user_id)
      byDay.set(d, rec)
    }

    return NextResponse.json({
      period: { from, to },
      group_by: 'day',
      data: Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          active_hours: Math.round((v.active / 3600) * 100) / 100,
          productive_hours: Math.round((v.productive / 3600) * 100) / 100,
          overtime_hours: Math.round((v.overtime / 3600) * 100) / 100,
          productivity_pct: v.active > 0 ? Math.round((v.productive / v.active) * 100) : 0,
          active_users: v.users.size,
        })),
    })
  }

  // groupBy === 'user'
  const userIds = [...new Set((metrics ?? []).map((m) => m.user_id))]
  const { data: users } = await db
    .from('users')
    .select('id, full_name, email, department')
    .in('id', userIds)
    .eq('tenant_id', token.tenantId)

  const userMap = new Map((users ?? []).map((u) => [u.id, u]))
  const byUser = new Map<
    string,
    { active: number; productive: number; overtime: number; days: number; ratios: number[] }
  >()

  for (const m of metrics ?? []) {
    const rec = byUser.get(m.user_id) ?? {
      active: 0,
      productive: 0,
      overtime: 0,
      days: 0,
      ratios: [],
    }
    rec.active += m.active_seconds ?? 0
    rec.productive += m.productive_seconds ?? 0
    rec.overtime += m.overtime_seconds ?? 0
    rec.days += 1
    if (m.productivity_ratio != null) rec.ratios.push(Number(m.productivity_ratio))
    byUser.set(m.user_id, rec)
  }

  return NextResponse.json({
    period: { from, to },
    group_by: 'user',
    data: Array.from(byUser.entries())
      .map(([uid, v]) => {
        const u = userMap.get(uid)
        const avgProd =
          v.ratios.length > 0 ? v.ratios.reduce((a, b) => a + b, 0) / v.ratios.length : 0
        return {
          user_id: uid,
          full_name: u?.full_name ?? null,
          email: u?.email ?? '',
          department: u?.department ?? null,
          active_hours: Math.round((v.active / 3600) * 100) / 100,
          productive_hours: Math.round((v.productive / 3600) * 100) / 100,
          overtime_hours: Math.round((v.overtime / 3600) * 100) / 100,
          productivity_pct: Math.round(avgProd * 100),
          days_worked: v.days,
        }
      })
      .sort((a, b) => b.active_hours - a.active_hours),
  })
}
