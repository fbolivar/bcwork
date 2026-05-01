import { getDb, setTenantContext } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getAccessTokenFromHeaders } from '@/lib/auth/session'
import type { JwtPayload } from '@bcwork/shared'

export interface Context {
  db: ReturnType<typeof getDb>
  user: JwtPayload | null
  ip: string
  userAgent: string
}

export async function createContext(req: Request): Promise<Context> {
  const db = getDb()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const userAgent = req.headers.get('user-agent') ?? ''

  const token = getAccessTokenFromHeaders(req.headers)
  if (!token) return { db, user: null, ip, userAgent }

  try {
    const user = await verifyAccessToken(token)
    // Setear contexto de tenant en Postgres para que RLS funcione
    if (user.tid) await setTenantContext(db, user.tid, user.role)
    return { db, user, ip, userAgent }
  } catch {
    return { db, user: null, ip, userAgent }
  }
}
