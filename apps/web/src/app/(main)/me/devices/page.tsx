'use client'

import { trpc } from '@/lib/trpc-client'
import { formatDate } from '@/lib/format'
import { Monitor, Shield, ShieldOff } from 'lucide-react'

const PLATFORM: Record<string, string> = { windows: 'Windows', macos: 'macOS', linux: 'Linux' }

export default function MyDevicesPage() {
  const { data, isLoading } = trpc.employee.getMyDevices.useQuery()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis dispositivos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Dispositivos con el agente BCWork instalado y vinculado a tu cuenta.
        </p>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
      ) : (data ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <Monitor className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-400">Sin dispositivos enrolados</p>
          <p className="mt-1 text-xs text-gray-300">
            Pide a tu administrador un código de enrolamiento
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4"
            >
              <div className="flex items-center gap-4">
                <Monitor className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{d.name}</p>
                  <p className="font-mono text-xs text-gray-400">{d.hostname}</p>
                  <p className="text-xs text-gray-400">
                    {(d.platform ? PLATFORM[d.platform] : null) ?? d.platform} · Enrolado{' '}
                    {formatDate(d.enrolled_at ?? '')}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {d.revoked_at ? (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <ShieldOff className="h-4 w-4" /> Revocado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Shield className="h-4 w-4" /> Activo
                  </span>
                )}
                {d.last_seen_at && (
                  <span className="text-xs text-gray-400">
                    Última conexión: {formatDate(d.last_seen_at)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700">
        <strong>Aviso de privacidad:</strong> el agente captura el nombre de las aplicaciones
        activas y el tiempo de uso. No accede a contenido de documentos, contraseñas ni capturas de
        pantalla. Tus datos se protegen bajo la Ley 1581/2012 (HABEAS DATA).
      </div>
    </div>
  )
}
