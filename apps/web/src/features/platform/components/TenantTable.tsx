'use client'

import { useState } from 'react'
import Link from 'next/link'
import { keepPreviousData } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc-client'
import { StatusBadge } from './StatusBadge'
import { formatCOP, formatDate, daysUntil } from '@/lib/format'

export function TenantTable() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'trial' | 'active' | 'suspended' | 'cancelled'>(
    'all',
  )
  const [page, setPage] = useState(1)

  const { data, isLoading } = trpc.platform.listTenants.useQuery(
    { search: search || undefined, status, page, pageSize: 20 },
    { placeholderData: keepPreviousData },
  )

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Buscar por nombre, NIT o email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status)
            setPage(1)
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos</option>
          <option value="trial">Trial</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Empresa</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">NIT</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Seats</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">MRR</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Vence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((tenant) => {
              const license = (
                tenant.licenses as unknown as Array<{
                  id: string
                  status: string
                  seats_total: number
                  plan_id: string
                  ends_at: string
                  trial_ends_at: string | null
                  plans: { code: string; name: string; monthly_price_per_seat_cop: number } | null
                }>
              )?.[0]
              const mrr = license
                ? (license.plans?.monthly_price_per_seat_cop ?? 0) * license.seats_total
                : 0
              const endDate = license?.trial_ends_at ?? license?.ends_at

              return (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/super-admin/tenants/${tenant.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {tenant.trade_name ?? tenant.legal_name}
                    </Link>
                    <p className="text-xs text-gray-400">{tenant.contact_email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{tenant.nit}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium uppercase">
                      {license?.plans?.code ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{license?.seats_total ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {license?.status === 'active' ? formatCOP(mrr) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={license?.status ?? tenant.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {endDate ? (
                      <>
                        {formatDate(endDate)}
                        {daysUntil(endDate) > 0 && (
                          <span className="ml-1 text-gray-400">({daysUntil(endDate)}d)</span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
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
