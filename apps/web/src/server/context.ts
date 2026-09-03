import { getDb, getTenantDb, setTenantContext } from '@/lib/db'
import { signSupabaseToken, isTenantRlsEnforced } from '@/lib/supabase-jwt'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getAccessTokenFromHeaders } from '@/lib/auth/session'
import type { JwtPayload } from '@bcwork/shared'

export interface Context {
  /**
   * Cliente para el trabajo normal de la petición.
   *
   * Con TENANT_RLS_ENFORCED=true es un cliente `authenticated` sujeto a RLS:
   * solo ve las filas del tenant del usuario, filtre o no la consulta.
   * Con el flag apagado cae al cliente service_role de siempre.
   */
  db: ReturnType<typeof getDb>
  /**
   * Cliente service_role, sin RLS. Solo para lo que es cross-tenant por diseño:
   * el panel de platform_admin y el login (que busca por email antes de saber
   * a qué empresa pertenece el usuario). No usarlo en los routers de tenant.
   */
  adminDb: ReturnType<typeof getDb>
  user: JwtPayload | null
  ip: string
  userAgent: string
}

export async function createContext(req: Request): Promise<Context> {
  const adminDb = getDb()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const userAgent = req.headers.get('user-agent') ?? ''

  const token = getAccessTokenFromHeaders(req.headers)
  if (!token) return { db: adminDb, adminDb, user: null, ip, userAgent }

  try {
    const user = await verifyAccessToken(token)

    if (!isTenantRlsEnforced()) {
      // Comportamiento heredado: todo con service_role. El aislamiento depende
      // del filtro por tenant_id en cada consulta.
      if (user.tid) await setTenantContext(adminDb, user.tid, user.role)
      return { db: adminDb, adminDb, user, ip, userAgent }
    }

    // El platform_admin trabaja entre empresas: no puede ir contra el RLS.
    if (user.role === 'platform_admin' || !user.tid) {
      return { db: adminDb, adminDb, user, ip, userAgent }
    }

    const supabaseToken = await signSupabaseToken(user)
    return { db: getTenantDb(supabaseToken), adminDb, user, ip, userAgent }
  } catch {
    return { db: adminDb, adminDb, user: null, ip, userAgent }
  }
}
