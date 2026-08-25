'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc-client'
import { formatDate } from '@/lib/format'
import { Package, Monitor, Search } from 'lucide-react'

const SOURCE_LABELS: Record<string, string> = {
  hklm: 'Sistema (64-bit)',
  hklm32: 'Sistema (32-bit)',
  hkcu: 'Usuario',
}

export function AppInventoryManager() {
  const [deviceId, setDeviceId] = useState<string | undefined>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: summary } = trpc.admin.getInventorySummary.useQuery()
  const { data: devices } = trpc.admin.listDevices.useQuery({ page: 1, pageSize: 100 })
  const { data, isLoading } = trpc.admin.listInstalledApps.useQuery(
    { deviceId, search: search.trim() || undefined, page, pageSize: 50 },
    { placeholderData: keepPreviousData },
  )

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium">Aplicaciones</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{summary?.totalApps ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Monitor className="h-4 w-4" />
            <span className="text-xs font-medium">Equipos con inventario</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {summary?.devicesWithInventory ?? '—'}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filtrar por equipo"
          value={deviceId ?? ''}
          onChange={(e) => {
            setDeviceId(e.target.value || undefined)
            setPage(1)
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los equipos</option>
          {(devices?.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name ?? d.hostname}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar aplicación…"
            className="rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Aplicación</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Versión</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Editor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Equipo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Instalada</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Origen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-400">Sin inventario todavía</p>
                  <p className="mt-1 text-xs text-gray-300">
                    El agente reporta las apps instaladas al iniciar y cada 12 horas.
                  </p>
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((app) => {
              const device = app.device as { hostname: string | null; name: string | null } | null
              return (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{app.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{app.version ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{app.publisher ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {device?.name ?? device?.hostname ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {app.install_date ? formatDate(app.install_date) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {(app.source ? SOURCE_LABELS[app.source] : null) ?? app.source ?? '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} de{' '}
            {data.total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * data.pageSize >= data.total}
              className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
