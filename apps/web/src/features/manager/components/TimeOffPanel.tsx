'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Check, X, Clock, CalendarOff } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacaciones',
  sick: 'Incapacidad',
  personal: 'Día personal',
  maternity: 'Lic. maternidad',
  paternity: 'Lic. paternidad',
  other: 'Otro',
}

function daysBetween(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  })
}

export function TimeOffPanel() {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.manager.getTimeOffRequests.useQuery({ status: filter })
  const reviewMutation = trpc.manager.reviewTimeOff.useMutation({
    onSuccess: () => void utils.manager.getTimeOffRequests.invalidate(),
  })

  const rows = data ?? []

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarOff className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-800">Solicitudes de ausencia</h2>
          {rows.filter((r) => r.status === 'pending').length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-100 px-1.5 text-[10px] font-bold text-orange-600">
              {rows.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </div>
        <select
          aria-label="Filtrar estado"
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'pending' | 'all')}
          className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="pending">Pendientes</option>
          <option value="all">Todas</option>
        </select>
      </div>

      {isLoading && <div className="px-5 py-8 text-center text-sm text-gray-400">Cargando...</div>}

      {!isLoading && rows.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          {filter === 'pending' ? 'No hay solicitudes pendientes' : 'No hay solicitudes'}
        </div>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-gray-50">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {r.user_name ?? r.user_email ?? 'Usuario'}
                </p>
                <p className="text-xs text-gray-500">
                  {TYPE_LABELS[r.type] ?? r.type} · {formatDate(r.starts_on)}
                  {r.starts_on !== r.ends_on && ` → ${formatDate(r.ends_on)}`}
                  {' · '}
                  <span className="font-medium">{daysBetween(r.starts_on, r.ends_on)}d</span>
                </p>
                {r.notes && (
                  <p className="mt-0.5 truncate text-xs italic text-gray-400">
                    &ldquo;{r.notes}&rdquo;
                  </p>
                )}
              </div>

              {r.status === 'pending' ? (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    title="Aprobar"
                    onClick={() => reviewMutation.mutate({ id: r.id, status: 'approved' })}
                    disabled={reviewMutation.isPending}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Rechazar"
                    onClick={() => reviewMutation.mutate({ id: r.id, status: 'rejected' })}
                    disabled={reviewMutation.isPending}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    r.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : r.status === 'rejected'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-yellow-100 text-yellow-600'
                  }`}
                >
                  {r.status === 'pending' && <Clock className="h-3 w-3" />}
                  {r.status === 'approved'
                    ? 'Aprobada'
                    : r.status === 'rejected'
                      ? 'Rechazada'
                      : 'Pendiente'}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
