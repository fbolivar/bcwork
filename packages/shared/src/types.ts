import type { Role, LICENSE_STATUS } from './constants'

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error }
}

export interface JwtPayload {
  sub: string        // user_id
  tid: string        // tenant_id (vacío para platform_admin)
  role: Role
  email: string
  iat: number
  exp: number
}

export interface AgentBatchPayload {
  batch_id: string
  events: AgentEvent[]
  session_state: SessionState
}

export interface AgentEvent {
  event_type: string
  app_identifier?: string
  domain?: string
  window_title?: string   // solo si opt-in
  productivity?: string
  started_at: string      // ISO 8601
  duration_seconds: number
  metadata?: Record<string, unknown>
}

export interface SessionState {
  session_id?: string
  started_at: string
  ip?: string
  is_active: boolean
  active_seconds: number
  idle_seconds: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}

export type LicenseStatus = (typeof LICENSE_STATUS)[keyof typeof LICENSE_STATUS]
