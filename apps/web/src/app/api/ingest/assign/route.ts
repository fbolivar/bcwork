import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { resolveAgentKey, getBearer } from '@/lib/agent-auth'
import { logAudit } from '@/lib/auth/audit'
import type { Database } from '@bcwork/db'

type DeviceUpdate = Database['public']['Tables']['agent_devices']['Update']

// Asignación 1-sola-vez: la persona se elige en el primer arranque.
// Solo funciona si el device aún NO está asignado (idempotente/anti-suplantación).
const AssignSchema = z.object({
  user_id: z.string().uuid(),
  device_name: z.string().min(1).max(100).nullish(),
})

export async function POST(req: NextRequest) {
  const rawKey = getBearer(req)
  if (!rawKey) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = AssignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  const db = getDb()
  const identity = await resolveAgentKey(db, rawKey, 'device:assign')
  if (!identity) return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })

  if (identity.userId !== null) {
    return NextResponse.json(
      { error: 'already_assigned', assigned_user_id: identity.userId },
      { status: 409 },
    )
  }

  // El usuario elegido debe pertenecer al mismo tenant y estar activo.
  const { data: target } = await db
    .from('users')
    .select('id, full_name, tenant_id, status')
    .eq('id', parsed.data.user_id)
    .eq('tenant_id', identity.tenantId)
    .single()

  if (!target || target.status !== 'active') {
    return NextResponse.json({ error: 'invalid_user' }, { status: 400 })
  }

  const update: DeviceUpdate = {
    user_id: target.id,
    assigned_at: new Date().toISOString(),
  }
  if (parsed.data.device_name) update.name = parsed.data.device_name

  const { error: updErr } = await db
    .from('agent_devices')
    .update(update)
    .eq('id', identity.deviceId)
    .is('user_id', null) // guard extra contra carrera

  if (updErr) {
    return NextResponse.json({ error: 'assign_failed', detail: updErr.message }, { status: 500 })
  }

  await logAudit(db, {
    tenantId: identity.tenantId,
    actorUserId: target.id,
    action: 'device.assigned',
    entityType: 'agent_device',
    entityId: identity.deviceId,
    ipInet: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0',
    userAgent: req.headers.get('user-agent') ?? '',
    after: { user_id: target.id },
  })

  return NextResponse.json({ ok: true, assigned_user_id: target.id })
}
