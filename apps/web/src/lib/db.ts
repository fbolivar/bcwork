import { createClient } from '@supabase/supabase-js'
import type { Database } from '@bcwork/db'

type SupabaseClient = ReturnType<typeof createClient<Database>>

let _db: SupabaseClient | null = null

// Singleton — evita crear un cliente nuevo por cada request.
// El service role usa HTTP/REST (PostgREST), sin estado de sesión persistente entre requests.
export function getDb(): SupabaseClient {
  if (_db) return _db
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  _db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _db
}

// Setea el contexto de tenant en la sesión Postgres antes de cualquier query.
// Llamar en cada request autenticado.
export async function setTenantContext(db: SupabaseClient, tenantId: string, role: string) {
  await db.rpc('set_tenant_context', {
    p_tenant: tenantId,
    p_role: role,
  })
}
