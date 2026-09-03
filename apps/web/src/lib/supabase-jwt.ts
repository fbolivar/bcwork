import { SignJWT } from 'jose'
import type { JwtPayload } from '@bcwork/shared'

/**
 * Firma un JWT que PostgREST acepta, para que las consultas de la app corran
 * como rol `authenticated` y el RLS se aplique de verdad.
 *
 * BCWork no usa Supabase Auth: la sesion es propia (`JWT_SECRET`). Este token
 * es distinto y se firma con el JWT Secret del proyecto Supabase
 * (`SUPABASE_JWT_SECRET`, Dashboard → Settings → API). Vive segundos y solo
 * viaja entre el servidor y PostgREST: nunca llega al navegador.
 *
 * Claims que consumen las politicas:
 *   sub               → auth.uid(), comparado contra users.id
 *   app_metadata.tid  → public.current_tenant_id()
 *   app_metadata.role → public.current_actor_role() / is_platform_admin()
 */

const TOKEN_TTL_SECONDS = 120

function getSupabaseJwtSecret(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error(
      'Falta SUPABASE_JWT_SECRET. Es el JWT Secret del proyecto Supabase ' +
        '(Dashboard → Settings → API) y hace falta para que el RLS aplique.',
    )
  }
  return new TextEncoder().encode(secret)
}

export async function signSupabaseToken(user: JwtPayload): Promise<string> {
  return new SignJWT({
    role: 'authenticated',
    app_metadata: { tid: user.tid ?? null, role: user.role },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuer('bcwork')
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSupabaseJwtSecret())
}

/** El aislamiento por RLS solo se activa con el flag encendido. */
export function isTenantRlsEnforced(): boolean {
  return process.env.TENANT_RLS_ENFORCED === 'true'
}
