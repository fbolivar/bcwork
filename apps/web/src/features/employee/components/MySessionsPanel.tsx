'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap,
  Coffee,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

function fmtHours(secs: number | null) {
  if (!secs) return '0m'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function duration(started: string, ended: string | null) {
  if (!ended) return null
  return Math.round((new Date(ended).getTime() - new Date(started).getTime()) / 1000)
}

const LOCATION_LABELS: Record<string, string> = {
  office: 'Oficina',
  home: 'Remoto',
  mixed: 'Mixto',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}

const EDIT_TYPES = [
  { value: 'missed_session', label: 'Sesión no registrada' },
  { value: 'wrong_app', label: 'Aplicación incorrecta' },
  { value: 'duration_error', label: 'Error en duración' },
  { value: 'other', label: 'Otro motivo' },
]

export function MySessionsPanel() {
  const [page, setPage] = useState(0)
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [editType, setEditType] = useState('missed_session')
  const [reason, setReason] = useState('')
  const [submitDone, setSubmitDone] = useState(false)

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.employee.getMySessions.useQuery({ page })
  const { data: edits } = trpc.employee.getMyActivityEdits.useQuery()
  const requestEdit = trpc.employee.requestActivityEdit.useMutation({
    onSuccess: () => {
      void utils.employee.getMyActivityEdits.invalidate()
      setSubmitDone(true)
      setTimeout(() => {
        setModalDate(null)
        setReason('')
        setEditType('missed_session')
        setSubmitDone(false)
      }, 2000)
    },
  })

  const sessions = data?.sessions ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 20
  const totalPages = Math.ceil(total / pageSize)

  type EditRow = NonNullable<typeof edits>[number]
  const editsByDate = new Map<string, EditRow[]>()
  for (const e of edits ?? []) {
    const d = e.applies_to_date ?? ''
    if (!editsByDate.has(d)) editsByDate.set(d, [])
    editsByDate.get(d)!.push(e)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis sesiones</h1>
        <p className="mt-1 text-sm text-gray-500">Historial de los últimos 30 días</p>
      </div>

      {isLoading && <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />}

      {!isLoading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-16">
          <CalendarClock className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Sin sesiones registradas en los últimos 30 días.</p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Entrada</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Salida</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Duración</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Activo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ubicación</th>
                <th className="px-4 py-3" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map((s) => {
                const sessionDate = s.started_at.slice(0, 10)
                const isActive = !s.ended_at
                const dur = duration(s.started_at, s.ended_at)
                const dayEdits = editsByDate.get(sessionDate) ?? []

                return (
                  <tr key={s.id} className={`hover:bg-gray-50 ${isActive ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3 text-gray-900">
                      <div className="flex items-center gap-1.5">
                        {isActive && (
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                        )}
                        {fmtDate(s.started_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">
                      {fmtTime(s.started_at)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">
                      {isActive ? (
                        <span className="font-medium text-green-600">Activa</span>
                      ) : s.ended_at ? (
                        fmtTime(s.ended_at)
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">
                      {dur != null
                        ? fmtHours(dur)
                        : isActive
                          ? fmtHours(
                              Math.round((Date.now() - new Date(s.started_at).getTime()) / 1000),
                            )
                          : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-blue-600">
                          <Zap className="h-3 w-3" />
                          {fmtHours(s.active_seconds)}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <Coffee className="h-3 w-3" />
                          {fmtHours(s.idle_seconds)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.location_type ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {LOCATION_LABELS[s.location_type] ?? s.location_type}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {dayEdits.length > 0 && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[dayEdits[0]!.status ?? 'pending'] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {dayEdits[0]!.status === 'pending'
                              ? 'Pendiente'
                              : dayEdits[0]!.status === 'approved'
                                ? 'Aprobado'
                                : 'Rechazado'}
                          </span>
                        )}
                        {dayEdits.length === 0 && (
                          <button
                            type="button"
                            onClick={() => setModalDate(sessionDate)}
                            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:border-blue-300 hover:text-blue-600"
                          >
                            Solicitar corrección
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} sesiones en total</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Página anterior"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              title="Página siguiente"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-md border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Solicitudes previas */}
      {(edits ?? []).length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Mis solicitudes de corrección
          </h2>
          <div className="space-y-2">
            {(edits ?? []).map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-gray-900">
                    {EDIT_TYPES.find((t) => t.value === e.edit_type)?.label ?? e.edit_type}
                    <span className="ml-2 text-xs text-gray-400">{e.applies_to_date}</span>
                  </p>
                  {e.reason && <p className="mt-0.5 text-xs text-gray-500">{e.reason}</p>}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[e.status ?? 'pending'] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {e.status === 'pending'
                    ? 'Pendiente'
                    : e.status === 'approved'
                      ? 'Aprobado'
                      : 'Rechazado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal solicitar corrección */}
      {modalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-base font-semibold text-gray-900">Solicitar corrección</h2>
            <p className="mb-4 text-sm text-gray-500">Para el día {modalDate}</p>

            {submitDone ? (
              <div className="flex flex-col items-center py-6">
                <CheckCircle2 className="mb-2 h-10 w-10 text-green-500" />
                <p className="text-sm font-medium text-gray-900">Solicitud enviada</p>
                <p className="mt-1 text-xs text-gray-500">
                  Tu manager recibirá la solicitud para revisión.
                </p>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  requestEdit.mutate({
                    applies_to_date: modalDate,
                    edit_type: editType as
                      | 'missed_session'
                      | 'wrong_app'
                      | 'duration_error'
                      | 'other',
                    reason,
                  })
                }}
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Tipo de corrección
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    title="Tipo de corrección"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {EDIT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Razón <span className="text-gray-400">(mínimo 5 caracteres)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    minLength={5}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Explica brevemente la corrección que necesitas..."
                  />
                </div>

                {requestEdit.error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-red-600">{requestEdit.error.message}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModalDate(null)
                      setReason('')
                    }}
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={requestEdit.isPending}
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {requestEdit.isPending ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
