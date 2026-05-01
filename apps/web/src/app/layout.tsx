import type { Metadata } from 'next'
import './globals.css'
import { TrpcProvider } from '@/lib/trpc-provider'

export const metadata: Metadata = {
  title: 'BCWork — Control de Teletrabajo',
  description: 'Plataforma SaaS de monitoreo de teletrabajo conforme a la ley colombiana',
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
