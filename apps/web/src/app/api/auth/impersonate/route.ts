import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getAccessToken } from '@/lib/auth/session'

const ACCESS_COOKIE = 'bcw_at'
const PREV_COOKIE = 'bcw_prev_at' // guarda el token del platform_admin para restaurar

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
}

// POST /api/auth/impersonate — activar impersonación
export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token: string }
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  try {
    await verifyAccessToken(token)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Guardar el token actual del platform_admin para poder restaurar
  const currentToken = req.cookies.get(ACCESS_COOKIE)?.value

  const res = NextResponse.json({ ok: true })
  if (currentToken) {
    res.cookies.set(PREV_COOKIE, currentToken, { ...COOKIE_BASE, maxAge: 3600 })
  }
  res.cookies.set(ACCESS_COOKIE, token, { ...COOKIE_BASE, maxAge: 3600 })
  return res
}

// DELETE /api/auth/impersonate — salir de impersonación
export async function DELETE(req: NextRequest) {
  const prevToken = req.cookies.get(PREV_COOKIE)?.value
  const res = NextResponse.json({ ok: true })

  res.cookies.delete(PREV_COOKIE)

  if (prevToken) {
    try {
      await verifyAccessToken(prevToken)
      res.cookies.set(ACCESS_COOKIE, prevToken, { ...COOKIE_BASE, maxAge: 3600 })
    } catch {
      res.cookies.delete(ACCESS_COOKIE)
    }
  } else {
    res.cookies.delete(ACCESS_COOKIE)
  }

  return res
}
