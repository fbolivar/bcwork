'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CalendarOff, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacaciones',
  sick: 'Enfermedad',
  personal: 'Personal',
  maternity: 'Maternidad',
  paternity: 'Paternidad',
  bereavement: 'Duelo',
  other: 'Otro',
}

export function LeaveApprovalsPanel() {
  const utils = trpc.useUtils()
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [noteMap, setNoteMap] = useState<Record<string, string>>({})

  const { data: requests, isLoading } = trpc.manager.getLeaveRequests.useQuery({ status: filter })
  const review = trpc.manager.reviewLeaveRequest.useMutation({
    onSuccess: () => {
      utils.manager.getLeaveRequests.invalidate()
      utils.manager.getPendingLeaveCount.invalidate()
      setExpandedId(null)
    },
  })

  const allReqs = (requests ?? []) as any[]

  const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-500',
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Solicitudes de ausencia</h2>
        <p className="mt-0.5 text-sm text-gray-500">Vacaciones, permisos y licencias del equipo</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
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
      ) : allReqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <CalendarOff className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay solicitudes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allReqs.map((r: any) => {
            const isOpen = expandedId === r.id
            return (
              <div
                key={r.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : r.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    {(r.full_name ?? r.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{r.full_name ?? r.email}</p>
                    <p className="text-xs text-gray-400">
                      {TYPE_LABELS[r.type] ?? r.type} · {r.start_date} → {r.end_date} (
                      {r.days_count} {Number(r.days_count) === 1 ? 'día' : 'días'})
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[r.status] ?? 'bg-gray-100 text-gray-500'}`}
                  >
                    {{ pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' }[
                      r.status as string
                    ] ?? r.status}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-gray-50 px-4 pb-4 pt-3">
                    {r.reason && (
                      <p className="mb-3 text-sm text-gray-600">
                        <span className="font-medium">Motivo:</span> {r.reason}
                      </p>
                    )}
                    {r.status === 'pending' && (
                      <div className="space-y-3">
                        <textarea
                          value={noteMap[r.id] ?? ''}
                          onChange={(e) => setNoteMap({ ...noteMap, [r.id]: e.target.value })}
                          placeholder="Nota para el empleado (opcional)..."
                          rows={2}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={review.isPending}
                            onClick={() =>
                              review.mutate({
                                id: r.id,
                                status: 'approved',
                                manager_note: noteMap[r.id] || undefined,
                              })
                            }
                            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={review.isPending}
                            onClick={() =>
                              review.mutate({
                                id: r.id,
                                status: 'rejected',
                                manager_note: noteMap[r.id] || undefined,
                              })
                            }
                            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Rechazar
                          </button>
                        </div>
                      </div>
                    )}
                    {r.manager_note && r.status !== 'pending' && (
                      <p className="mt-1 text-xs text-gray-500">
                        <span className="font-medium">Nota:</span> {r.manager_note}
                      </p>
                    )}
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
