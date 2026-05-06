'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Check, X, Clock, PenLine } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  meeting: 'Reunión',
  call: 'Llamada',
  travel: 'Desplazamiento',
  training: 'Capacitación',
  offline_work: 'Trabajo offline',
  other: 'Otro',
}

function fmtDuration(mins: number | null) {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  })
}

export function ManualTimePanel() {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({})
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.manager.getManualTimeEntries.useQuery({ status: filter })
  const reviewMutation = trpc.manager.reviewManualTimeEntry.useMutation({
    onSuccess: () => void utils.manager.getManualTimeEntries.invalidate(),
  })

  const rows = data ?? []
  const pendingCount = rows.filter((r) => r.status === 'pending').length

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-800">Tiempo manual</h2>
          {pendingCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-100 px-1.5 text-[10px] font-bold text-orange-600">
              {pendingCount}
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
          {filter === 'pending' ? 'No hay solicitudes pendientes' : 'No hay registros'}
        </div>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-gray-50">
          {rows.map((r) => (
            <li key={r.id} className="px-5 py-3.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {r.user_name ?? r.user_email ?? 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {TYPE_LABELS[r.entry_type] ?? r.entry_type} · {fmtDate(r.entry_date)} ·{' '}
                    {r.started_at.slice(0, 5)}–{r.ended_at.slice(0, 5)} ·{' '}
                    <span className="font-medium">{fmtDuration(r.duration_minutes)}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs italic text-gray-400">
                    &ldquo;{r.description}&rdquo;
                  </p>
                </div>

                {r.status === 'pending' ? (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      title="Aprobar"
                      onClick={() =>
                        reviewMutation.mutate({
                          id: r.id,
                          status: 'approved',
                          review_note: reviewNote[r.id] || undefined,
                        })
                      }
                      disabled={reviewMutation.isPending}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Rechazar"
                      onClick={() =>
                        reviewMutation.mutate({
                          id: r.id,
                          status: 'rejected',
                          review_note: reviewNote[r.id] || undefined,
                        })
                      }
                      disabled={reviewMutation.isPending}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      r.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'rejected'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-yellow-100 text-yellow-600'
                    }`}
                  >
                    {r.status === 'approved'
                      ? 'Aprobada'
                      : r.status === 'rejected'
                        ? 'Rechazada'
                        : 'Pendiente'}
                  </span>
                )}
              </div>

              {r.status === 'pending' && (
                <input
                  type="text"
                  placeholder="Nota opcional para el empleado..."
                  value={reviewNote[r.id] ?? ''}
                  onChange={(e) => setReviewNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              )}

              {r.review_note && r.status !== 'pending' && (
                <p className="mt-1 text-[10px] italic text-gray-400">Nota: {r.review_note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
