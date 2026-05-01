import type { getDb } from '@/lib/db'

type AuditAction =
  | 'user.login'
  | 'user.login_failed'
  | 'user.logout'
  | 'user.signup'
  | 'user.password_changed'
  | 'user.mfa_enabled'
  | 'user.mfa_disabled'
  | 'user.locked'
  | 'user.unlocked'
  | 'user.created'
  | 'user.deleted'
  | 'tenant.created'
  | 'license.created'
  | 'license.updated'
  | 'data.exported'
  | 'data.delete_requested'
  | 'consent.granted'
  | 'consent.revoked'

interface AuditEntry {
  tenantId?: string
  actorUserId?: string
  action: AuditAction
  entityType?: string
  entityId?: string
  ipInet?: string
  userAgent?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

export async function logAudit(db: ReturnType<typeof getDb>, entry: AuditEntry): Promise<void> {
  // Fire-and-forget: los errores de auditoría no deben romper el flujo principal
  db.from('audit_logs')
    .insert({
      tenant_id: entry.tenantId ?? null,
      actor_user_id: entry.actorUserId ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      ip_inet: entry.ipInet ?? null,
      user_agent: entry.userAgent ?? null,
      before_state: entry.before ?? null,
      after_state: entry.after ?? null,
    })
    .then(({ error }) => {
      if (error) console.error('[audit] failed to log:', entry.action, error.message)
    })
}
