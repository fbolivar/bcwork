import { NextRequest, NextResponse } from 'next/server'
import { verifyApiToken, requireScope } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

/**
 * GET /api/v1/payroll
 *
 * Exporta horas trabajadas por empleado en un período para integración con sistemas de nómina.
 * Scope requerido: payroll:read
 *
 * Query params:
 *   from  YYYY-MM-DD  (requerido)
 *   to    YYYY-MM-DD  (requerido)
 *   format json|csv   (default: json)
 *   userId uuid       (opcional, filtra un empleado)
 */
export async function GET(req: NextRequest) {
  const token = await verifyApiToken(req.headers.get('authorization'))
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireScope(token, 'payroll:read'))
    return NextResponse.json(
      { error: 'Insufficient scope — required: payroll:read' },
      { status: 403 },
    )

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const format = searchParams.get('format') ?? 'json'
  const userId = searchParams.get('userId')

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
      'user_id, metric_date, active_seconds, productive_seconds, overtime_seconds, location_type',
    )
    .eq('tenant_id', token.tenantId)
    .gte('metric_date', from)
    .lte('metric_date', to)
    .order('user_id')
    .order('metric_date')

  if (userId) query = query.eq('user_id', userId)

  const { data: metrics, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = [...new Set((metrics ?? []).map((m) => m.user_id))]
  const { data: users } = await db
    .from('users')
    .select('id, full_name, email, department, position')
    .in('id', userIds)
    .eq('tenant_id', token.tenantId)

  const userMap = new Map((users ?? []).map((u) => [u.id, u]))

  // Agrupar por usuario
  const byUser = new Map<
    string,
    {
      user_id: string
      full_name: string | null
      email: string
      department: string | null
      position: string | null
      total_hours: number
      productive_hours: number
      overtime_hours: number
      days_worked: number
      days: Array<{ date: string; hours: number; overtime_hours: number; location: string }>
    }
  >()

  for (const m of metrics ?? []) {
    const u = userMap.get(m.user_id)
    if (!byUser.has(m.user_id)) {
      byUser.set(m.user_id, {
        user_id: m.user_id,
        full_name: u?.full_name ?? null,
        email: u?.email ?? '',
        department: u?.department ?? null,
        position: u?.position ?? null,
        total_hours: 0,
        productive_hours: 0,
        overtime_hours: 0,
        days_worked: 0,
        days: [],
      })
    }
    const rec = byUser.get(m.user_id)!
    const hours = Math.round(((m.active_seconds ?? 0) / 3600) * 100) / 100
    const ot = Math.round(((m.overtime_seconds ?? 0) / 3600) * 100) / 100
    const prod = Math.round(((m.productive_seconds ?? 0) / 3600) * 100) / 100
    rec.total_hours += hours
    rec.productive_hours += prod
    rec.overtime_hours += ot
    rec.days_worked += 1
    rec.days.push({
      date: m.metric_date ?? '',
      hours,
      overtime_hours: ot,
      location: m.location_type ?? 'remote',
    })
  }

  const records = Array.from(byUser.values()).map((r) => ({
    ...r,
    total_hours: Math.round(r.total_hours * 100) / 100,
    productive_hours: Math.round(r.productive_hours * 100) / 100,
    overtime_hours: Math.round(r.overtime_hours * 100) / 100,
  }))

  if (format === 'csv') {
    const csvRows = records.flatMap((r) =>
      r.days.map((d) => ({
        user_id: r.user_id,
        full_name: r.full_name ?? '',
        email: r.email,
        department: r.department ?? '',
        position: r.position ?? '',
        date: d.date,
        hours: d.hours,
        overtime_hours: d.overtime_hours,
        location_type: d.location,
      })),
    )

    const headers = Object.keys(csvRows[0] ?? {})
    const csv = [
      headers.join(','),
      ...csvRows.map((row) =>
        headers
          .map((h) => {
            const v = (row as Record<string, unknown>)[h]
            if (v == null) return ''
            const s = String(v)
            return s.includes(',') ? `"${s}"` : s
          })
          .join(','),
      ),
    ].join('\r\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="payroll_${from}_${to}.csv"`,
      },
    })
  }

  return NextResponse.json({
    period: { from, to },
    tenant_id: token.tenantId,
    generated_at: new Date().toISOString(),
    total_employees: records.length,
    records,
  })
}
