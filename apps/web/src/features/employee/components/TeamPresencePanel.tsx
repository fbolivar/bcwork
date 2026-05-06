'use client'

import { trpc } from '@/lib/trpc-client'
import { Users, Circle } from 'lucide-react'

function fmtLastSeen(iso: string | null) {
  if (!iso) return 'Nunca'
  const d = new Date(iso)
  const now = new Date()
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (mins < 2) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function TeamPresencePanel() {
  const { data, isLoading } = trpc.employee.getTeamPresence.useQuery(undefined, {
    refetchInterval: 30000,
  })

  const online = (data ?? []).filter((u) => u.is_online)
  const offline = (data ?? []).filter((u) => !u.is_online)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Presencia del equipo</h1>
        <p className="mt-0.5 text-sm text-gray-500">Ve quién está conectado en este momento</p>
      </div>

      {!isLoading && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
            <p className="text-xs text-green-600">En línea ahora</p>
            <p className="mt-0.5 text-2xl font-bold text-green-700">{online.length}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Total equipo</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-700">{(data ?? []).length}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {online.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Activos ahora
              </p>
              <div className="space-y-2">
                {online.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3"
                  >
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-200 text-sm font-semibold text-green-800">
                      {(u.full_name ?? 'U')[0]?.toUpperCase()}
                      <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{u.full_name}</p>
                      {(u.department ?? u.position) && (
                        <p className="truncate text-xs text-gray-500">
                          {u.position ?? u.department}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-green-600">En línea</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {offline.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Desconectados
              </p>
              <div className="space-y-2">
                {offline.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
                  >
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-500">
                      {(u.full_name ?? 'U')[0]?.toUpperCase()}
                      <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-gray-400 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-700">{u.full_name}</p>
                      {(u.department ?? u.position) && (
                        <p className="truncate text-xs text-gray-400">
                          {u.position ?? u.department}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{fmtLastSeen(u.last_seen)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Sin compañeros visibles</p>
          <p className="mt-1 text-xs text-gray-400">
            Solo verás compañeros activos en las últimas 24h
          </p>
        </div>
      )}
    </div>
  )
}
