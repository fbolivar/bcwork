'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/format'

const ACTION_COLORS: Record<string, string> = {
  'user.login': 'bg-blue-100 text-blue-700',
  'user.logout': 'bg-gray-100 text-gray-600',
  'user.create': 'bg-green-100 text-green-700',
  'user.update': 'bg-amber-100 text-amber-700',
  'user.delete': 'bg-red-100 text-red-600',
  'user.password_reset': 'bg-purple-100 text-purple-700',
  'device.enrolled': 'bg-teal-100 text-teal-700',
  'device.revoked': 'bg-orange-100 text-orange-700',
  'tenant.update': 'bg-indigo-100 text-indigo-700',
  'mfa.enabled': 'bg-green-100 text-green-700',
  'mfa.disabled': 'bg-red-100 text-red-600',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-600'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{action}</span>
}

export default function AuditPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ from: '', to: '', action: '' })
  const PAGE_SIZE = 50

  const { data, isLoading } = trpc.admin.getAuditLogs.useQuery({
    page,
    pageSize: PAGE_SIZE,
    from: filters.from || undefined,
    to: filters.to || undefined,
    action: filters.action || undefined,
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-gray-400" />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Registro de auditoría</h1>
          <p className="text-sm text-gray-500">Todas las acciones registradas en el sistema</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Desde</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => {
              setFilters((f) => ({ ...f, from: e.target.value }))
              setPage(1)
            }}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Hasta</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => {
              setFilters((f) => ({ ...f, to: e.target.value }))
              setPage(1)
            }}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Acción</label>
          <input
            type="text"
            value={filters.action}
            onChange={(e) => {
              setFilters((f) => ({ ...f, action: e.target.value }))
              setPage(1)
            }}
            placeholder="ej: user.login"
            className="rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
          />
        </div>
        {(filters.from || filters.to || filters.action) && (
          <button
            type="button"
            onClick={() => {
              setFilters({ from: '', to: '', action: '' })
              setPage(1)
            }}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{data?.total ?? 0} eventos</span>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="space-y-px">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : (data?.logs ?? []).length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Sin eventos para los filtros seleccionados
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Acción</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">IP</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
              {/* @ts-ignore – Supabase join inference exceeds TS recursion limit */}
              {(data?.logs ?? []).map((log: Record<string, unknown>) => (
                <tr key={log.id as string} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-500">
                    {formatDate((log.created_at as string | null) ?? '')}
                  </td>
                  <td className="px-4 py-2.5">
                    <ActionBadge action={log.action as string} />
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-medium text-gray-700">
                      {(log.actor_name as string | null) ?? (log.actor_email as string | null)}
                    </p>
                    {(log.actor_name as string | null) && (
                      <p className="text-[10px] text-gray-400">{log.actor_email as string}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-2.5 md:table-cell">
                    <span className="font-mono text-xs text-gray-400">
                      {(log.ip_address as string | null) ?? '—'}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2.5 lg:table-cell">
                    {(log.target_id as string | null) && (
                      <span className="font-mono text-[10px] text-gray-400">
                        {log.target_type as string}: {(log.target_id as string).slice(0, 8)}…
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Pág. {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
