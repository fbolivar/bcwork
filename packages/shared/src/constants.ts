export const APP_NAME = 'BCWork'
export const APP_VERSION = '0.1.0'

export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  TENANT_ADMIN: 'tenant_admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const LICENSE_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
} as const

export const PRODUCTIVITY = {
  PRODUCTIVE: 'productive',
  NEUTRAL: 'neutral',
  NON_PRODUCTIVE: 'non_productive',
} as const

export const EVENT_TYPES = {
  APP_FOCUS: 'app_focus',
  DOMAIN_VISIT: 'domain_visit',
  IDLE_START: 'idle_start',
  IDLE_END: 'idle_end',
  PAUSE: 'pause',
  RESUME: 'resume',
} as const

export const PLANS = {
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const

// Ley 2191/2022 — Desconexión Digital
export const DISCONNECTION_GRACE_MINUTES = 15
export const IDLE_THRESHOLD_MINUTES = 5
export const AGENT_BATCH_INTERVAL_SECONDS = 300 // 5 min

// Auth
export const JWT_EXPIRY_SECONDS = 8 * 60 * 60 // 8 h
export const REFRESH_TOKEN_EXPIRY_DAYS = 7
export const MAX_FAILED_LOGIN_ATTEMPTS = 5
export const LOCKOUT_MINUTES = 15
export const PASSWORD_HISTORY_COUNT = 5
export const PASSWORD_MAX_AGE_DAYS = 90
