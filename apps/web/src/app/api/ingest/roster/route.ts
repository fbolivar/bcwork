import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { resolveAgentKey, getBearer } from '@/lib/agent-auth'

// Lista de colaboradores activos del tenant, para el picker "elige tu nombre 1 vez".
// Autenticado con el api_key del device (scope roster:read).
export async function GET(req: NextRequest) {
  const rawKey = getBearer(req)
  if (!rawKey) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = getDb()
  const identity = await resolveAgentKey(db, rawKey, 'roster:read')
  if (!identity) return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })

  const { data, error } = await db
    .from('users')
    .select('id, full_name, email')
    .eq('tenant_id', identity.tenantId)
    .eq('status', 'active')
    .in('role', ['employee', 'manager', 'tenant_admin'])
    .order('full_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'roster_failed' }, { status: 500 })
  }

  return NextResponse.json({
    already_assigned: identity.userId !== null,
    assigned_user_id: identity.userId,
    users: (data ?? []).map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: String(u.email),
    })),
  })
}
