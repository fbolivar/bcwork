import { NextResponse, type NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { getAccessToken } from '@/lib/auth/session'

// Rutas que NO requieren autenticación
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/api/trpc/auth.login',
  '/api/trpc/auth.signupTenant',
  '/api/trpc/auth.refresh',
])

// Rutas que solo platform_admin puede acceder
const PLATFORM_ADMIN_PATHS = ['/super-admin']

// Rutas por rol de tenant
const ROLE_PATHS: Record<string, string[]> = {
  tenant_admin: ['/admin', '/onboarding'],
  manager: ['/manager'],
  employee: ['/me'],
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Siempre permitir assets, imágenes y rutas Next.js internas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/health')
  ) {
    return NextResponse.next()
  }

  // Rutas públicas — pasar sin verificar token
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/api/trpc/auth.')) {
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
        // Redirigir al dashboard correcto para el rol actual
        return NextResponse.redirect(new URL(getDashboardForRole(user.role), req.url))
      }
    }

    // Propagar identidad al request para server components
    const headers = new Headers(req.headers)
    headers.set('x-user-id', user.sub)
    headers.set('x-tenant-id', user.tid)
    headers.set('x-user-role', user.role)

    return NextResponse.next({ request: { headers } })
  } catch {
    // Token inválido o expirado → intentar refresh via redirect
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
