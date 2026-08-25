'use client'

import { trpc } from '@/lib/trpc-client'
import { formatDate } from '@/lib/format'
import { RefreshCw, CheckCircle2, AlertCircle, Rocket } from 'lucide-react'

function relativeTime(iso: string | null): string {
  if (!iso) return 'Nunca'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export function AgentUpdatesManager() {
  const { data: latest } = trpc.admin.getLatestAgentVersion.useQuery()
  const { data: devices } = trpc.admin.listDevices.useQuery(
    { page: 1, pageSize: 100 },
    { refetchInterval: 30000 },
  )
  const { data: users } = trpc.admin.listUsers.useQuery({
    role: 'all',
    status: 'active',
    page: 1,
    pageSize: 100,
  })

  const list = (devices?.data ?? []).filter((d) => !d.revoked_at)
  const latestV = latest?.version ?? null
  const updated = list.filter((d) => d.service_version === latestV).length

  return (
    <div className="space-y-5">
      {/* Versión actual */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-center gap-3">
          <Rocket className="h-6 w-6 text-blue-600" />
          <div>
            <p className="text-xs font-medium text-blue-500">Versión publicada</p>
            <p className="text-xl font-bold text-blue-900">{latestV ?? '—'}</p>
            {latest?.notes && <p className="mt-0.5 text-xs text-blue-600">{latest.notes}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-900">
            {updated}/{list.length}
          </p>
          <p className="text-xs text-blue-500">equipos actualizados</p>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Los agentes verifican actualizaciones al iniciar y cada 6 horas, y se actualizan solos en
        silencio. No requiere reinstalar nada en los equipos.
      </p>

      {/* Tabla de equipos */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Equipo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Versión</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Última conexión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  Sin equipos con agente
                </td>
              </tr>
            )}
            {list.map((d) => {
              const user = (users?.data ?? []).find((u) => u.id === d.user_id)
              const isUpdated = latestV && d.service_version === latestV
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{d.name ?? d.hostname}</p>
                    <p className="font-mono text-xs text-gray-400">{d.hostname}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {user?.full_name ?? user?.email ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-gray-700">
                      {d.service_version ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {isUpdated ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Actualizado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <RefreshCw className="h-3.5 w-3.5" /> Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {relativeTime(d.last_seen_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <span>
          Publicar una versión nueva requiere compilar y firmar el instalador (proceso técnico). Una
          vez publicada, los equipos se actualizan solos en las siguientes horas.
        </span>
      </div>
    </div>
  )
}
