import { createClient } from '@supabase/supabase-js'

// Server-only: usa service role para saltarse RLS cuando es necesario.
// Para queries protegidas, llama set_tenant_context() antes de cualquier query.
export function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Setea el contexto de tenant en la sesión Postgres antes de cualquier query.
// Llamar en cada request autenticado.
export async function setTenantContext(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  role: string,
) {
  await db.rpc('set_tenant_context', {
    p_tenant: tenantId,
    p_role: role,
  })
}
