import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getDb } from '@/lib/db'

async function resolveKey(
  db: ReturnType<typeof getDb>,
  rawKey: string,
): Promise<{ tenantId: string } | null> {
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const { data } = await db
    .from('api_keys')
    .select('tenant_id, scopes, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  const scopes = data.scopes as string[]
  if (!scopes.includes('ingest:activity')) return null

  return { tenantId: data.tenant_id }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const identity = await resolveKey(db, authHeader.slice(7))
  if (!identity) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })
  }

  const { data, error } = await db
    .from('app_catalog')
    .select('identifier, productivity')
    .eq('tenant_id', identity.tenantId)
    .eq('identifier_type', 'domain')

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })

  const rules: Record<string, string> = {}
  for (const row of data ?? []) {
    rules[row.identifier] = row.productivity
  }

  return NextResponse.json(rules, {
    headers: { 'Cache-Control': 'max-age=300' }, // cache 5 min
  })
}
