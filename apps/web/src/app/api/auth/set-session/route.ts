import { NextResponse, type NextRequest } from 'next/server'
import { setAuthCookies } from '@/lib/auth/session'
import { verifyAccessToken } from '@/lib/auth/jwt'

export async function POST(req: NextRequest) {
  const { accessToken, refreshToken } = (await req.json()) as {
    accessToken: string
    refreshToken: string
  }

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
  }

  // Verificar que el access token sea válido antes de guardarlo
  try {
    await verifyAccessToken(accessToken)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  setAuthCookies(res, accessToken, refreshToken)
  return res
}
