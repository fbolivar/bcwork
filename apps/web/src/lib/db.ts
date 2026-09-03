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

/**
 * Cliente por-petición que consulta como rol `authenticated`, con el JWT del
 * usuario. A diferencia de `getDb()`, este NO tiene BYPASSRLS: las políticas
 * `tenant_isolation` se aplican y el aislamiento deja de depender de que cada
 * query recuerde filtrar por `tenant_id`.
 *
 * No se cachea: cada usuario necesita su propio token.
 */
export function getTenantDb(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

// Setea el contexto de tenant en la sesión Postgres antes de cualquier query.
//
// OBSOLETO: no protege nada. `set_config` corre en una conexión del pool de
// PostgREST distinta de la que ejecuta la query siguiente, así que el GUC nunca
// llega. Se conserva solo mientras el flag TENANT_RLS_ENFORCED esté apagado.
export async function setTenantContext(db: SupabaseClient, tenantId: string, role: string) {
  await db.rpc('set_tenant_context', {
    p_tenant: tenantId,
    p_role: role,
  })
}
