import { createHash, randomBytes } from 'crypto'
import { getDb } from './db'

export interface ApiTokenPayload {
  tokenId: string
  tenantId: string
  scopes: string[]
}

export function generateApiToken(): { raw: string; hash: string } {
  const raw = `bcw_${randomBytes(32).toString('hex')}`
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

export function hashApiToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export async function verifyApiToken(authHeader: string | null): Promise<ApiTokenPayload | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const raw = authHeader.slice(7)
  const hash = hashApiToken(raw)

  const db = getDb()
  const { data } = await db
    .from('api_tokens')
    .select('id, tenant_id, scopes, expires_at')
    .eq('token_hash', hash)
    .is('revoked_at', null)
    .maybeSingle()

  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  // Actualizar last_used_at de forma async (no bloqueante)
  void db.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)

  return {
    tokenId: data.id,
    tenantId: data.tenant_id,
    scopes: data.scopes as string[],
  }
}

export function requireScope(payload: ApiTokenPayload, scope: string): boolean {
  return payload.scopes.includes(scope) || payload.scopes.includes('*')
}
