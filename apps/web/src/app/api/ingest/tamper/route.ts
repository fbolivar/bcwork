import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { resolveAgentKey, getBearer } from '@/lib/agent-auth'
import { logAudit } from '@/lib/auth/audit'

// El agente reporta un intento de manipulación (parar servicio, desinstalar, etc.)
// para que quede visible en el panel del admin.
const TamperSchema = z.object({
  status: z.enum(['stop_attempt', 'uninstall_attempt', 'tampered']),
  detail: z.string().max(500).nullish(),
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
  const parsed = TamperSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const db = getDb()
  const identity = await resolveAgentKey(db, rawKey, 'ingest:activity')
  if (!identity) return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })

  await db
    .from('agent_devices')
    .update({ tamper_status: parsed.data.status })
    .eq('id', identity.deviceId)

  await logAudit(db, {
    tenantId: identity.tenantId,
    actorUserId: identity.userId ?? undefined,
    action: 'device.tamper_detected',
    entityType: 'agent_device',
    entityId: identity.deviceId,
    ipInet: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0',
    userAgent: req.headers.get('user-agent') ?? '',
    after: { status: parsed.data.status, detail: parsed.data.detail ?? null },
  })

  return NextResponse.json({ ok: true })
}
