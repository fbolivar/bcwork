import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getDb } from '@/lib/db'

async function resolveApiKey(
  db: ReturnType<typeof import('@/lib/db').getDb>,
  rawKey: string,
): Promise<{ tenantId: string; userId: string; deviceId: string } | null> {
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const { data } = await db
    .from('api_keys')
    .select('id, tenant_id, created_by, name, scopes, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  const scopes = data.scopes as string[]
  if (!scopes.includes('ingest:activity') && !scopes.includes('ingest:screenshot')) return null
  if (!data.created_by) return null

  const deviceId = (data.name as string).replace('agent:', '')
  await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return { tenantId: data.tenant_id, userId: data.created_by, deviceId }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const rawKey = authHeader.slice(7)

  const db = getDb()
  const identity = await resolveApiKey(db, rawKey)
  if (!identity) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })
  }

  const { tenantId, userId, deviceId } = identity

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 400 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  const imageFile = formData.get('image') as File | null
  if (!imageFile) {
    return NextResponse.json({ error: 'missing image field' }, { status: 400 })
  }

  const sessionId = (formData.get('session_id') as string | null) ?? null
  const takenAt = (formData.get('taken_at') as string | null) ?? new Date().toISOString()

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(imageFile.type)) {
    return NextResponse.json({ error: 'invalid image type' }, { status: 400 })
  }

  if (imageFile.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'image too large (max 5 MB)' }, { status: 400 })
  }

  const date = takenAt.slice(0, 10)
  const ts = Date.now()
  const ext =
    imageFile.type === 'image/jpeg' ? 'jpg' : imageFile.type === 'image/webp' ? 'webp' : 'png'
  const storagePath = `${userId}/${date}/${ts}.${ext}`

  const buffer = await imageFile.arrayBuffer()
  const { error: uploadErr } = await db.storage
    .from('screenshots')
    .upload(storagePath, buffer, { contentType: imageFile.type, upsert: false })

  if (uploadErr) {
    console.error('[ingest/screenshot] upload failed:', uploadErr.message)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }

  const insertRow = {
    tenant_id: tenantId,
    user_id: userId,
    device_id: deviceId as string,
    session_id: sessionId,
    taken_at: takenAt,
    storage_path: storagePath,
  }

  const { error: insertErr } = await db
    .from('screenshots')
    .insert(insertRow as import('@bcwork/db').Database['public']['Tables']['screenshots']['Insert'])

  if (insertErr) {
    console.error('[ingest/screenshot] insert failed:', insertErr.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, path: storagePath })
}
