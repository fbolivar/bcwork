import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { logAudit } from '@/lib/auth/audit'

const EnrollSchema = z.object({
  code: z.string().length(8),
  device_name: z.string().min(1).max(100),
  platform: z.enum(['windows', 'macos', 'linux']),
  hostname: z.string().min(1).max(255),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = EnrollSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { code, device_name, platform, hostname } = parsed.data
  const db = getDb()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const userAgent = req.headers.get('user-agent') ?? ''

  const { data: enrollment, error: enrollErr } = await db
    .from('enrollment_codes')
    .select('id, tenant_id, user_id, expires_at, used_at')
    .eq('code', code)
    .is('used_at', null)
    .single()

  if (enrollErr || !enrollment) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 401 })
  }

  if (new Date(enrollment.expires_at) < new Date()) {
    return NextResponse.json({ error: 'code_expired' }, { status: 401 })
  }

  // Generar API key antes de insertar device (necesitamos el hash para device_token_hash)
  const rawKey = randomBytes(32).toString('hex')
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { data: device, error: deviceErr } = await db
    .from('agent_devices')
    .insert({
      tenant_id: enrollment.tenant_id,
      user_id: enrollment.user_id,
      name: device_name,
      os: platform,
      hostname,
      agent_version: '0.1.0',
      device_token_hash: keyHash,
      enrolled_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (deviceErr || !device) {
    console.error('device_create_failed:', deviceErr)
    return NextResponse.json(
      { error: 'device_create_failed', detail: deviceErr?.message },
      { status: 500 },
    )
  }

  const { error: keyErr } = await db.from('api_keys').insert({
    tenant_id: enrollment.tenant_id,
    name: `agent:${device.id}`,
    key_prefix: rawKey.slice(0, 8),
    key_hash: keyHash,
    scopes: ['ingest:activity'],
    created_by: enrollment.user_id,
  })

  if (keyErr) {
    console.error('api_key_create_failed:', keyErr)
    return NextResponse.json(
      { error: 'api_key_create_failed', detail: keyErr.message },
      { status: 500 },
    )
  }

  await db
    .from('enrollment_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', enrollment.id)

  await logAudit(db, {
    tenantId: enrollment.tenant_id,
    actorUserId: enrollment.user_id,
    action: 'device.enrolled',
    entityType: 'agent_device',
    entityId: device.id,
    ipInet: ip,
    userAgent,
    after: { device_name, platform, hostname },
  })

  return NextResponse.json({
    device_id: device.id,
    api_key: rawKey,
  })
}
