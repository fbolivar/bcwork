import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getAccessToken } from '@/lib/auth/session'
import { rateLimit } from '@/lib/rate-limit'

// Rutas que NO requieren autenticación
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/consent',
  '/api/trpc/auth.login',
  '/api/trpc/auth.signupTenant',
  '/api/trpc/auth.refresh',
])

// Rutas públicas por prefijo
const PUBLIC_PREFIXES = [
  '/api/trpc/auth.',
  '/api/v1/', // autenticadas por API token propio
  '/api/ingest/', // autenticadas por API key propio
  '/legal/',
]

// Rutas que solo platform_admin puede acceder
const PLATFORM_ADMIN_PATHS = ['/super-admin']

// Rutas por rol de tenant
const ROLE_PATHS: Record<string, string[]> = {
  tenant_admin: ['/admin', '/onboarding'],
  manager: ['/manager'],
  employee: ['/me'],
}

// Rate limit: 60 req/min por IP para la API v1
const API_V1_LIMIT = { limit: 60, window: 60 }
// Rate limit: 120 req/min por IP para la API de ingest (el agente envía en batch)
const INGEST_LIMIT = { limit: 120, window: 60 }

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Siempre permitir assets y rutas Next.js internas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next()
  }

  // OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/v1/')) {
    return new NextResponse(null, { status: 204 })
  }

  // Rate limiting en API v1
  if (pathname.startsWith('/api/v1/')) {
    const ip = getClientIp(req)
    const result = rateLimit(`v1:${ip}`, API_V1_LIMIT.limit, API_V1_LIMIT.window)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.reset),
            'Retry-After': String(result.reset - Math.floor(Date.now() / 1000)),
          },
        },
      )
    }
  }

  // Rate limiting en ingest
  if (pathname.startsWith('/api/ingest/')) {
    const ip = getClientIp(req)
    const result = rateLimit(`ingest:${ip}`, INGEST_LIMIT.limit, INGEST_LIMIT.window)
    if (!result.success) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }
  }

  // Rutas públicas — pasar sin verificar token
  if (PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = getAccessToken(req)

  // Sin token → redirigir a login
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const user = await verifyAccessToken(token)

    // Verificar acceso por rol
    if (PLATFORM_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
      if (user.role !== 'platform_admin') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    for (const [role, paths] of Object.entries(ROLE_PATHS)) {
      if (paths.some((p) => pathname.startsWith(p)) && user.role !== role) {
        return NextResponse.redirect(new URL(getDashboardForRole(user.role), req.url))
      }
    }

    // Redirigir empleados sin consentimiento (solo aplica a rutas /me/*)
    // El chequeo real se hace en el layout del servidor para leer la DB
    const consentHeader = req.headers.get('x-consent-required')
    if (consentHeader === 'true' && pathname.startsWith('/me/') && pathname !== '/consent') {
      return NextResponse.redirect(new URL('/consent', req.url))
    }

    // Propagar identidad al request para server components
    const headers = new Headers(req.headers)
    headers.set('x-user-id', user.sub)
    headers.set('x-tenant-id', user.tid)
    headers.set('x-user-role', user.role)

    return NextResponse.next({ request: { headers } })
  } catch {
    const refreshUrl = new URL('/api/auth/refresh-redirect', req.url)
    refreshUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(refreshUrl)
  }
}

function getDashboardForRole(role: string): string {
  switch (role) {
    case 'platform_admin':
      return '/super-admin'
    case 'tenant_admin':
      return '/admin/dashboard'
    case 'manager':
      return '/manager/dashboard'
    case 'employee':
      return '/me/dashboard'
    default:
      return '/login'
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
