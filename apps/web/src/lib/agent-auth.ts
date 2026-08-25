import { createHash } from 'crypto'
import type { getDb } from '@/lib/db'

export interface AgentIdentity {
  apiKeyId: string
  tenantId: string
  deviceId: string
  /** userId asignado al device; null si el device aún no fue asignado a una persona. */
  userId: string | null
  scopes: string[]
}

/**
 * Resuelve el Bearer api_key del agente a su identidad.
 * La atribución del usuario proviene de agent_devices.user_id (asignación 1-sola-vez),
 * NO de api_keys.created_by (que apunta al admin que creó el token).
 */
export async function resolveAgentKey(
  db: ReturnType<typeof getDb>,
  rawKey: string,
  requiredScope: string,
): Promise<AgentIdentity | null> {
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { data: key } = await db
    .from('api_keys')
    .select('id, tenant_id, name, scopes, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (!key) return null
  if (key.expires_at && new Date(key.expires_at) < new Date()) return null

  const scopes = (key.scopes as string[]) ?? []
  if (!scopes.includes(requiredScope)) return null

  const deviceId = (key.name as string).replace('agent:', '')

  const { data: device } = await db
    .from('agent_devices')
    .select('id, user_id, tenant_id, revoked_at')
    .eq('id', deviceId)
    .single()

  if (!device) return null
  if (device.revoked_at) return null

  await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id)

  return {
    apiKeyId: key.id,
    tenantId: device.tenant_id,
    deviceId,
    userId: device.user_id ?? null,
    scopes,
  }
}

export function getBearer(req: Request): string | null {
  const h = req.headers.get('authorization')
  if (!h?.startsWith('Bearer ')) return null
  return h.slice(7)
}
