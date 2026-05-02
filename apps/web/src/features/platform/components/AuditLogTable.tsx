'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc-client'
import { formatDateTime } from '@/lib/format'

export function AuditLogTable({ tenantId }: { tenantId?: string }) {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = trpc.platform.listAuditLogs.useQuery(
    { tenantId, action: action || undefined, page, pageSize: 50 },
    { placeholderData: keepPreviousData },
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input
          type="search"
          placeholder="Filtrar por acción..."
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setPage(1)
          }}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Acción</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Actor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Entidad</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Sin registros
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-gray-500">
                  {formatDateTime(log.occurred_at ?? '')}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                  {log.actor_user_id ? log.actor_user_id.slice(0, 8) + '…' : '—'}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {log.entity_type
                    ? `${log.entity_type}:${(log.entity_id ?? '').slice(0, 8)}…`
                    : '—'}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                  {(log.ip_inet as string | null) ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} de{' '}
            {data.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
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
