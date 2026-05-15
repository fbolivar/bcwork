'use client'

import { useState } from 'react'
import Link from 'next/link'
import { keepPreviousData } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc-client'
import { StatusBadge } from './StatusBadge'
import { formatDate } from '@/lib/format'
import { Search, Building2 } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Admin',
  manager: 'Manager',
  employee: 'Empleado',
}

export function UserSearchTable() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)

  // Debounce manual sencillo
  function handleSearch(v: string) {
    setQuery(v)
    setPage(1)
    clearTimeout((handleSearch as unknown as { timer?: ReturnType<typeof setTimeout> }).timer)
    ;(handleSearch as unknown as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(
      () => setDebouncedQuery(v),
      350,
    )
  }

  const enabled = debouncedQuery.trim().length >= 2
  const { data, isLoading } = trpc.platform.searchUsers.useQuery(
    { query: debouncedQuery, page, pageSize: 20 },
    { enabled, placeholderData: keepPreviousData },
  )

  type UserRow = {
    id: string
    full_name: string | null
    email: string
    role: string
    status: string
    created_at: string | null
    tenant_id: string | null
    tenants: { legal_name: string; trade_name: string | null } | null
  }

  const rows = (data?.data ?? []) as UserRow[]

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nombre o email (mín. 2 caracteres)..."
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {!enabled && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Search className="h-8 w-8 text-gray-200" />
          <p className="text-sm text-gray-400">Escribe al menos 2 caracteres para buscar</p>
        </div>
      )}

      {enabled && isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {enabled && !isLoading && rows.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">
          Sin resultados para "{debouncedQuery}"
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Usuario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Empresa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Rol</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{user.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {user.tenant_id ? (
                      <Link
                        href={`/super-admin/tenants/${user.tenant_id}`}
                        className="flex items-center gap-1.5 text-blue-600 hover:underline"
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[160px] truncate">
                          {user.tenants?.trade_name ?? user.tenants?.legal_name ?? '—'}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user.created_at ? formatDate(user.created_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
