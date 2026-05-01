import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth/jwt'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0]!)
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h]
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
  // Autenticación por cookie (mismo mecanismo que el middleware)
  const token = req.cookies.get('bcwork_access')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let payload: { sub: string; tid: string; role: string }
  try {
    payload = (await verifyAccessToken(token)) as typeof payload
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!['tenant_admin', 'platform_admin', 'manager'].includes(payload.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
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
    .eq('tenant_id', payload.tid)
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
    .eq('tenant_id', payload.tid)

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
