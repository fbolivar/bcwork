import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { logAudit } from '@/lib/auth/audit'

// Aprovisionamiento por-tenant SIN código de usuario.
// El instalador trae un token de tenant embebido; el servicio lo envía en el
// primer arranque y recibe device_id + api_key. El device queda "sin asignar"
// hasta que la persona se elija una sola vez (ver /api/ingest/assign).

const ProvisionSchema = z.object({
  token: z.string().min(16).max(128),
  platform: z.enum(['windows', 'macos', 'linux']),
  hostname: z.string().min(1).max(255),
  windows_username: z.string().max(255).nullish(),
  service_version: z.string().max(50).nullish(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = ProvisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { token, platform, hostname, windows_username, service_version } = parsed.data
  const db = getDb()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const userAgent = req.headers.get('user-agent') ?? ''

  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data: prov, error: provErr } = await db
    .from('agent_provisioning_tokens')
    .select('id, tenant_id, created_by, revoked_at')
    .eq('token_hash', tokenHash)
    .single()

  if (provErr || !prov) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }
  if (prov.revoked_at) {
    return NextResponse.json({ error: 'token_revoked' }, { status: 401 })
  }

  // API key del device (el hash sirve también como device_token_hash)
  const rawKey = randomBytes(32).toString('hex')
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { data: device, error: deviceErr } = await db
    .from('agent_devices')
    .insert({
      tenant_id: prov.tenant_id,
      user_id: null, // sin asignar hasta que la persona se elija
      name: hostname,
      os: platform,
      platform,
      hostname,
      windows_username: windows_username ?? null,
      agent_version: service_version ?? '1.0.0',
      service_version: service_version ?? null,
      device_token_hash: keyHash,
      provisioning_token: prov.id,
      enrolled_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (deviceErr || !device) {
    console.error('provision_device_failed:', deviceErr)
    return NextResponse.json(
      { error: 'device_create_failed', detail: deviceErr?.message },
      { status: 500 },
    )
  }

  const { error: keyErr } = await db.from('api_keys').insert({
    tenant_id: prov.tenant_id,
    name: `agent:${device.id}`,
    key_prefix: rawKey.slice(0, 8),
    key_hash: keyHash,
    scopes: ['ingest:activity', 'roster:read', 'device:assign'],
    created_by: prov.created_by,
  })

  if (keyErr) {
    console.error('provision_api_key_failed:', keyErr)
    return NextResponse.json(
      { error: 'api_key_create_failed', detail: keyErr.message },
      { status: 500 },
    )
  }

  // Métricas del token
  const { data: current } = await db
    .from('agent_provisioning_tokens')
    .select('provisioned_count')
    .eq('id', prov.id)
    .single()
  await db
    .from('agent_provisioning_tokens')
    .update({
      last_used_at: new Date().toISOString(),
      provisioned_count: (current?.provisioned_count ?? 0) + 1,
    })
    .eq('id', prov.id)

  await logAudit(db, {
    tenantId: prov.tenant_id,
    actorUserId: prov.created_by,
    action: 'device.enrolled',
    entityType: 'agent_device',
    entityId: device.id,
    ipInet: ip,
    userAgent,
    after: { hostname, platform, windows_username, via: 'provisioning_token' },
  })

  return NextResponse.json({
    device_id: device.id,
    api_key: rawKey,
    assigned: false,
  })
}
