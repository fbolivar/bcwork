import { type NextResponse, type NextRequest } from 'next/server'
import { REFRESH_TOKEN_EXPIRY_DAYS } from '@bcwork/shared'

const REFRESH_COOKIE = 'bcw_rt'
const ACCESS_COOKIE = 'bcw_at'

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
}

export function setAuthCookies(res: NextResponse, accessToken: string, refreshToken: string) {
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    ...COOKIE_BASE,
    maxAge: 15 * 60, // 15 min
  })
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    ...COOKIE_BASE,
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/api/trpc/auth.refresh', // restringir al endpoint de refresh
  })
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.delete(ACCESS_COOKIE)
  res.cookies.delete(REFRESH_COOKIE)
}

export function getAccessToken(req: NextRequest): string | undefined {
  return req.cookies.get(ACCESS_COOKIE)?.value
}

export function getRefreshToken(req: NextRequest): string | undefined {
  return req.cookies.get(REFRESH_COOKIE)?.value
}

// Para server actions y route handlers que no son NextRequest
export function getAccessTokenFromHeaders(headers: Headers): string | undefined {
  const auth = headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)

  // También aceptar desde cookie en server components
  const cookie = headers.get('cookie')
  if (!cookie) return undefined
  const match = cookie.match(new RegExp(`${ACCESS_COOKIE}=([^;]+)`))
  return match?.[1]
}
