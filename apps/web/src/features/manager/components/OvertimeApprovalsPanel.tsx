'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Clock4, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const TYPE_LABELS: Record<string, string> = {
  payment: 'Pago',
  compensation: 'Compensatorio',
}

export function OvertimeApprovalsPanel() {
  const utils = trpc.useUtils()
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const { data: items, isLoading } = trpc.manager.getOvertimeRequests.useQuery({ status: filter })

  const review = trpc.manager.reviewOvertimeRequest.useMutation({
    onSuccess: () => {
      utils.manager.getOvertimeRequests.invalidate()
      utils.manager.getPendingOvertimeCount.invalidate()
      setReviewId(null)
      setNote('')
    },
  })

  const allItems = (items ?? []) as any[]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Horas extra</h2>
        <p className="mt-0.5 text-sm text-gray-500">Aprueba o rechaza solicitudes de tu equipo</p>
      </div>

      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {
              {
                pending: 'Pendientes',
                approved: 'Aprobadas',
                rejected: 'Rechazadas',
                all: 'Todas',
              }[s]
            }
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Clock4 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            No hay solicitudes{' '}
            {filter !== 'all'
              ? { pending: 'pendientes', approved: 'aprobadas', rejected: 'rechazadas' }[filter]
              : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allItems.map((item: any) => {
            const isExpanded = reviewId === item.id
            return (
              <div
                key={item.id}
                className={`rounded-xl border ${item.status === 'pending' ? 'border-orange-100 bg-orange-50' : item.status === 'approved' ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-white'}`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <Clock4
                    className={`h-4 w-4 shrink-0 ${item.status === 'pending' ? 'text-orange-500' : item.status === 'approved' ? 'text-green-500' : 'text-gray-400'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {item.user_name ?? item.user_email}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {new Date(item.date + 'T12:00:00').toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                      })}
                      {' · '}
                      {fmtHours(item.overtime_seconds)}
                      {' · '}
                      {TYPE_LABELS[item.type] ?? item.type}
                      {item.department && ` · ${item.department}`}
                    </p>
                    {item.reason && (
                      <p className="mt-0.5 text-xs italic text-gray-400">"{item.reason}"</p>
                    )}
                    {item.manager_note && (
                      <p className="mt-0.5 text-xs text-gray-400">Nota: {item.manager_note}</p>
                    )}
                  </div>
                  {item.status === 'approved' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {item.status === 'rejected' && <XCircle className="h-4 w-4 text-red-400" />}
                  {item.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => setReviewId(isExpanded ? null : item.id)}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Revisar
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div className="space-y-3 border-t border-orange-100 px-4 py-3">
                    <textarea
                      placeholder="Nota opcional para el empleado..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={review.isPending}
                        onClick={() =>
                          review.mutate({
                            id: item.id,
                            status: 'approved',
                            manager_note: note || undefined,
                          })
                        }
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Aprobar
                      </button>
                      <button
                        type="button"
                        disabled={review.isPending}
                        onClick={() =>
                          review.mutate({
                            id: item.id,
                            status: 'rejected',
                            manager_note: note || undefined,
                          })
                        }
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" /> Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
