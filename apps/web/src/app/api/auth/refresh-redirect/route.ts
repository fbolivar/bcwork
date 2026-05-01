import { NextResponse, type NextRequest } from 'next/server'

// Redirige al login cuando el access token expiró.
// El cliente JavaScript se encargará del refresh automático via tRPC.
export function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') ?? '/'
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', callbackUrl)
  loginUrl.searchParams.set('expired', '1')
  return NextResponse.redirect(loginUrl)
}
