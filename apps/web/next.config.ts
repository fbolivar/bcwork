import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  experimental: { mcpServer: true } as any,

  transpilePackages: ['@bcwork/shared', '@bcwork/db', '@bcwork/ui'],

  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js (Turbopack) requiere unsafe-inline + unsafe-eval en dev para HMR
      isDev
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self'",
      isDev
        ? "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* ws://127.0.0.1:* https://www.googleapis.com https://graph.facebook.com https://*.sentry.io"
        : "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googleapis.com https://graph.facebook.com https://*.sentry.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ')

    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      { key: 'Content-Security-Policy', value: csp },
    ]

    return [
      // Cabeceras de seguridad en todas las rutas
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // CORS para la API pública v1 (consumida por sistemas externos)
      {
        source: '/api/v1/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
          { key: 'Access-Control-Max-Age', value: '86400' },
          // La API v1 es solo-lectura — no necesita CORP restrictivo
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ]
  },

  logging: {
    fetches: { fullUrl: true },
  },
}

export default withSentryConfig(nextConfig, {
  org: 'bcwork',
  project: 'bcwork-web',

  // Only upload source maps in CI/production to avoid slowing down local dev
  silent: true,
  disableLogger: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  widenClientFileUpload: true,

  // Disable source map upload when no auth token is set
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
})
