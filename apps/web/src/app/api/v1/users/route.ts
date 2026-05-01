import { NextRequest, NextResponse } from 'next/server'
import { verifyApiToken, requireScope } from '@/lib/api-auth'
import { getDb } from '@/lib/db'

/**
 * GET /api/v1/users
 *
 * Lista empleados activos del tenant. Scope requerido: users:read
 *
 * Query params:
 *   page      number  (default: 1)
 *   pageSize  number  (default: 50, max: 200)
 *   status    active|inactive|suspended (default: active)
 */
export async function GET(req: NextRequest) {
  const token = await verifyApiToken(req.headers.get('authorization'))
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireScope(token, 'users:read'))
    return NextResponse.json(
      { error: 'Insufficient scope — required: users:read' },
      { status: 403 },
    )

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10)))
  const status = searchParams.get('status') ?? 'active'

  const db = getDb()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await db
    .from('users')
    .select('id, full_name, email, role, status, department, position, last_login_at, created_at', {
      count: 'exact',
    })
    .eq('tenant_id', token.tenantId)
    .eq('status', status)
    .order('full_name')
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    page,
    page_size: pageSize,
    total: count ?? 0,
    total_pages: Math.ceil((count ?? 0) / pageSize),
    users: data ?? [],
  })
}
