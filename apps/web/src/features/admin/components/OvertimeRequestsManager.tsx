'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CheckCircle, XCircle, Clock, X } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const TYPE_LABELS: Record<string, string> = {
  payment: 'Pago económico',
  compensation: 'Descanso compensatorio',
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprobada', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rechazada', cls: 'bg-red-100 text-red-700' },
}

function ReviewModal({
  req,
  action,
  onClose,
  onDone,
}: {
  req: { id: string; date: string; overtime_seconds: number }
  action: 'approved' | 'rejected'
  onClose: () => void
  onDone: () => void
}) {
  const utils = trpc.useUtils()
  const [note, setNote] = useState('')
  const update = trpc.admin.updateOvertimeRequest.useMutation({
    onSuccess: () => {
      void utils.admin.getOvertimeRequests.invalidate()
      onDone()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {action === 'approved' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
          </h3>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {req.date} · {fmtHours(req.overtime_seconds)}
        </p>
        <div className="mt-4">
          <label className="text-xs font-medium text-gray-700">
            Nota para el empleado (opcional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={
              action === 'rejected'
                ? 'Explica el motivo del rechazo…'
                : 'Instrucciones para la compensación…'
            }
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ id: req.id, status: action, manager_note: note || undefined })
            }
            className={`flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50 ${action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {update.isPending ? 'Guardando…' : action === 'approved' ? 'Aprobar' : 'Rechazar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function OvertimeRequestsManager() {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [reviewing, setReviewing] = useState<{
    req: { id: string; date: string; overtime_seconds: number }
    action: 'approved' | 'rejected'
  } | null>(null)

  const { data, isLoading } = trpc.admin.getOvertimeRequests.useQuery({ status: filter })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Solicitudes de horas extra</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Revisa y aprueba las solicitudes de los empleados
          </p>
        </div>
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {
              {
                pending: 'Pendientes',
                approved: 'Aprobadas',
                rejected: 'Rechazadas',
                all: 'Todas',
              }[f]
            }
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((req) => {
            const emp = req.users as {
              full_name: string | null
              email: string
              department: string | null
            } | null
            const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG['pending']!
            return (
              <div key={req.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{emp?.full_name ?? 'Empleado'}</p>
                      {emp?.department && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                          {emp.department}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
                      <span>{req.date}</span>
                      <span className="font-semibold tabular-nums text-gray-900">
                        {fmtHours(req.overtime_seconds)}
                      </span>
                      <span className="text-gray-400">·</span>
                      <span>{TYPE_LABELS[req.type] ?? req.type}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">{req.reason}</p>
                    {req.manager_note && (
                      <p className="mt-1 text-xs text-gray-400">Nota: {req.manager_note}</p>
                    )}
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setReviewing({
                            req: {
                              id: req.id,
                              date: req.date,
                              overtime_seconds: req.overtime_seconds,
                            },
                            action: 'approved',
                          })
                        }
                        className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReviewing({
                            req: {
                              id: req.id,
                              date: req.date,
                              overtime_seconds: req.overtime_seconds,
                            },
                            action: 'rejected',
                          })
                        }
                        className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Clock className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">
            Sin solicitudes{' '}
            {filter !== 'all' ? `${filter === 'pending' ? 'pendientes' : filter}` : ''}
          </p>
        </div>
      )}

      {reviewing && (
        <ReviewModal
          req={reviewing.req}
          action={reviewing.action}
          onClose={() => setReviewing(null)}
          onDone={() => setReviewing(null)}
        />
      )}
    </div>
  )
}
