import { NextRequest, NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getDb } from '@/lib/db'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0]!)
  const lines = [
    cols.join(','),
    ...rows.map((r) =>
      cols
        .map((c) => {
          const v = r[c]
          if (v == null) return ''
          const s = String(v)
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s
        })
        .join(','),
    ),
  ]
  return lines.join('\r\n')
}

export async function GET(req: NextRequest) {
  // El middleware ya validó el JWT y seteó estos headers
  const h = await nextHeaders()
  const tenantId = h.get('x-tenant-id')
  const role = h.get('x-user-role')

  if (!tenantId || !['tenant_admin', 'manager'].includes(role ?? '')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const days = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 90)
  const userId = searchParams.get('userId')
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const db = getDb()

  let query = db
    .from('daily_user_metrics')
    .select(
      'metric_date, user_id, active_seconds, productive_seconds, non_productive_seconds, productivity_ratio, focus_score, overtime_seconds, location_type',
    )
    .eq('tenant_id', tenantId)
    .gte('metric_date', from)
    .order('metric_date', { ascending: true })
    .order('user_id')

  if (userId) query = query.eq('user_id', userId)

  const { data: metrics, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquecer con nombre de usuario
  const userIds = [...new Set((metrics ?? []).map((m) => m.user_id))]
  const { data: users } = await db
    .from('users')
    .select('id, full_name, email')
    .in('id', userIds)
    .eq('tenant_id', tenantId)

  const userMap = new Map((users ?? []).map((u) => [u.id, u]))

  const rows = (metrics ?? []).map((m) => {
    const u = userMap.get(m.user_id)
    return {
      fecha: m.metric_date,
      usuario_id: m.user_id,
      nombre: u?.full_name ?? '',
      email: u?.email ?? '',
      segundos_activo: m.active_seconds ?? 0,
      segundos_productivo: m.productive_seconds ?? 0,
      segundos_no_productivo: m.non_productive_seconds ?? 0,
      productividad_pct:
        m.productivity_ratio != null ? Math.round(Number(m.productivity_ratio) * 100) : '',
      focus_score: m.focus_score != null ? Number(m.focus_score).toFixed(2) : '',
      segundos_overtime: m.overtime_seconds ?? 0,
      tipo_ubicacion: m.location_type ?? '',
    }
  })

  const csv = toCsv(rows as Record<string, unknown>[])
  const filename = `bcwork_metrics_${from}_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
