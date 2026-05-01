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

  const { data: device, error: deviceErr } = await db
    .from('agent_devices')
    .insert({
      tenant_id: enrollment.tenant_id,
      user_id: enrollment.user_id,
      name: device_name,
      platform,
      hostname,
      enrolled_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (deviceErr || !device) {
    return NextResponse.json({ error: 'device_create_failed' }, { status: 500 })
  }

  const rawKey = randomBytes(32).toString('hex')
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { error: keyErr } = await db.from('api_keys').insert({
    tenant_id: enrollment.tenant_id,
    user_id: enrollment.user_id,
    name: `agent:${device.id}`,
    key_hash: keyHash,
    scopes: ['ingest:activity'],
  })

  if (keyErr) {
    return NextResponse.json({ error: 'api_key_create_failed' }, { status: 500 })
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
