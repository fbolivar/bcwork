import { z } from 'zod'

export const emailSchema = z.string().email().toLowerCase()

export const passwordSchema = z
  .string()
  .min(12, 'Mínimo 12 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  mfa_code: z.string().length(6).optional(),
})

export const signupTenantSchema = z.object({
  legal_name: z.string().min(2).max(200),
  trade_name: z.string().max(200).optional(),
  nit: z.string().regex(/^\d{9,10}-\d$/, 'NIT inválido (formato: 123456789-0)'),
  contact_email: emailSchema,
  contact_phone: z.string().max(20).optional(),
  timezone: z.string().default('America/Bogota'),
  admin_full_name: z.string().min(2).max(200),
  admin_password: passwordSchema,
})

export const agentBatchSchema = z.object({
  batch_id: z.string().uuid(),
  events: z
    .array(
      z.object({
        event_type: z.enum([
          'app_focus',
          'domain_visit',
          'idle_start',
          'idle_end',
          'pause',
          'resume',
        ]),
        app_identifier: z.string().max(255).optional(),
        domain: z.string().max(255).optional(),
        window_title: z.string().max(500).optional(),
        productivity: z.enum(['productive', 'neutral', 'non_productive']).optional(),
        started_at: z.string().datetime(),
        duration_seconds: z.number().int().min(0).max(86400),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .max(1000),
  session_state: z.object({
    session_id: z.string().uuid().optional(),
    started_at: z.string().datetime(),
    ip: z.string().optional(),
    is_active: z.boolean(),
    active_seconds: z.number().int().min(0),
    idle_seconds: z.number().int().min(0),
  }),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupTenantInput = z.infer<typeof signupTenantSchema>
export type AgentBatchInput = z.infer<typeof agentBatchSchema>
