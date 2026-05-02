import type { Metadata } from 'next'
import './globals.css'
import { TrpcProvider } from '@/lib/trpc-provider'

export const metadata: Metadata = {
  title: 'BCWork — Control de Teletrabajo',
  description: 'Plataforma SaaS de monitoreo de teletrabajo conforme a la ley colombiana',
  icons: {
    icon: [
      { url: '/brand/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
  openGraph: {
    title: 'BCWork — Control de Teletrabajo',
    description: 'Plataforma SaaS de monitoreo de teletrabajo conforme a la ley colombiana',
    images: [{ url: '/brand/og-image.png', width: 1200, height: 300 }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body>
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  )
}
