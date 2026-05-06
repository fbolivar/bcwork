'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import {
  CalendarClock,
  Clock,
  Zap,
  Coffee,
  MapPin,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  XCircle,
} from 'lucide-react'

function fmtHours(secs: number | null) {
  if (!secs || secs <= 0) return '0m'
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

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function sessionDuration(started: string, ended: string | null) {
  const end = ended ? new Date(ended).getTime() : Date.now()
  return Math.round((end - new Date(started).getTime()) / 1000)
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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const EDIT_TYPES = [
  { value: 'missed_session', label: 'Sesión no registrada' },
  { value: 'wrong_app', label: 'Aplicación incorrecta' },
  { value: 'duration_error', label: 'Error en duración' },
  { value: 'other', label: 'Otro motivo' },
]

type DaysPeriod = 7 | 14 | 30 | 60

type ModalSession = {
  date: string
  started_at: string
  ended_at: string | null
  active_seconds: number | null
  idle_seconds: number | null
}

export function MySessionsPanel() {
  const [days, setDays] = useState<DaysPeriod>(30)
  const [modalSession, setModalSession] = useState<ModalSession | null>(null)
  const [editType, setEditType] = useState('missed_session')
  const [reason, setReason] = useState('')
  const [submitDone, setSubmitDone] = useState(false)

  const utils = trpc.useUtils()
  const { data: sessions = [], isLoading } = trpc.employee.getMySessions.useQuery({ days })
  const { data: edits } = trpc.employee.getMyActivityEdits.useQuery()
  const requestEdit = trpc.employee.requestActivityEdit.useMutation({
    onSuccess: () => {
      void utils.employee.getMyActivityEdits.invalidate()
      setSubmitDone(true)
      setTimeout(() => {
        setModalSession(null)
        setReason('')
        setEditType('missed_session')
        setSubmitDone(false)
      }, 2000)
    },
  })

  // #1 — Auto-refresh cada 60s si hay sesión activa
  const hasActive = sessions.some((s) => !s.ended_at)
  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(() => void utils.employee.getMySessions.invalidate(), 60_000)
    return () => clearInterval(id)
  }, [hasActive, utils])

  // #2 — Resumen del período
  const summary = useMemo(() => {
    const totalActive = sessions.reduce((acc, s) => acc + (s.active_seconds ?? 0), 0)
    const uniqueDays = new Set(sessions.map((s) => s.started_at.slice(0, 10))).size
    const avgDaily = uniqueDays > 0 ? Math.round(totalActive / uniqueDays) : 0
    return { totalActive, uniqueDays, avgDaily }
  }, [sessions])

  // Índice de edits por fecha
  type EditRow = NonNullable<typeof edits>[number]
  const editsByDate = useMemo(() => {
    const map = new Map<string, EditRow[]>()
    for (const e of edits ?? []) {
      const d = String(e.applies_to_date ?? '')
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(e)
    }
    return map
  }, [edits])

  // #4 — Puede solicitar corrección si no hay pendiente/aprobado para ese día
  function canRequestCorrection(date: string) {
    const dayEdits = editsByDate.get(date) ?? []
    return !dayEdits.some((e) => e.status === 'pending' || e.status === 'approved')
  }

  function getLatestEdit(date: string): EditRow | undefined {
    return (editsByDate.get(date) ?? [])[0]
  }

  return (
    <div className="space-y-6">
      {/* Encabezado con selector de período */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mis sesiones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Historial de actividad registrada por el agente
          </p>
        </div>
        {/* #3 — Selector de período */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {([7, 14, 30, 60] as DaysPeriod[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                days === d ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* #2 — KPIs del período */}
      {!isLoading && sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Total activo',
              value: fmtHours(summary.totalActive),
              color: 'bg-blue-50 text-blue-700',
            },
            {
              label: 'Promedio diario',
              value: fmtHours(summary.avgDaily),
              color: 'bg-purple-50 text-purple-700',
            },
            {
              label: 'Días con actividad',
              value: `${summary.uniqueDays}`,
              color: 'bg-gray-50 text-gray-700',
            },
          ].map((k) => (
            <div key={k.label} className={`rounded-xl p-4 ${k.color}`}>
              <p className="text-xs font-medium opacity-70">{k.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading && <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />}

      {!isLoading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-16">
          <CalendarClock className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">
            Sin sesiones registradas en los últimos {days} días.
          </p>
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
                {/* #5 — columna productividad con barra */}
                <th className="px-4 py-3 text-left font-medium text-gray-500">Productividad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ubicación</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map((s) => {
                const sessionDate = s.started_at.slice(0, 10)
                const isActive = !s.ended_at
                const dur = sessionDuration(s.started_at, s.ended_at)
                const latestEdit = getLatestEdit(sessionDate)
                const canRequest = canRequestCorrection(sessionDate)

                // #5 — barra de productividad
                const totalSecs = (s.active_seconds ?? 0) + (s.idle_seconds ?? 0)
                const activePct =
                  totalSecs > 0 ? Math.round(((s.active_seconds ?? 0) / totalSecs) * 100) : 0

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
                      <div className="flex items-center gap-1">
                        {isActive && <Clock className="h-3 w-3 text-green-500" />}
                        {fmtHours(dur)}
                      </div>
                    </td>
                    {/* #5 — barra de productividad */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-0.5 text-blue-600">
                            <Zap className="h-3 w-3" />
                            {fmtHours(s.active_seconds)}
                          </span>
                          <span className="flex items-center gap-0.5 text-gray-400">
                            <Coffee className="h-3 w-3" />
                            {fmtHours(s.idle_seconds)}
                          </span>
                        </div>
                        {totalSecs > 0 && (
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const filled = activePct >= (i + 1) * 20
                              const color =
                                activePct >= 70
                                  ? 'bg-blue-500'
                                  : activePct >= 40
                                    ? 'bg-yellow-400'
                                    : 'bg-red-400'
                              return (
                                <div
                                  key={i}
                                  className={`h-1.5 w-3 rounded-full ${filled ? color : 'bg-gray-200'}`}
                                />
                              )
                            })}
                          </div>
                        )}
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
                        {/* #4 — muestra estado pero permite nueva solicitud si fue rechazada */}
                        {latestEdit && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[latestEdit.status ?? 'pending'] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {STATUS_LABELS[latestEdit.status ?? 'pending'] ?? latestEdit.status}
                          </span>
                        )}
                        {canRequest && (
                          <button
                            type="button"
                            onClick={() =>
                              setModalSession({
                                date: sessionDate,
                                started_at: s.started_at,
                                ended_at: s.ended_at,
                                active_seconds: s.active_seconds,
                                idle_seconds: s.idle_seconds,
                              })
                            }
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

      {/* #10 — Enlace cruzado a métricas */}
      {sessions.length > 0 && (
        <div className="flex justify-end">
          <Link
            href="/me/metrics"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
          >
            <BarChart2 className="h-4 w-4" />
            Ver mi rendimiento en detalle →
          </Link>
        </div>
      )}

      {/* #9 — Solicitudes con motivo de rechazo */}
      {(edits ?? []).length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Mis solicitudes de corrección
          </h2>
          <div className="space-y-2">
            {(edits ?? []).map((e) => (
              <div key={e.id} className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">
                      {EDIT_TYPES.find((t) => t.value === e.edit_type)?.label ?? e.edit_type}
                      <span className="ml-2 text-xs text-gray-400">
                        {/* #8 — fecha legible */}
                        {e.applies_to_date ? fmtDateLong(String(e.applies_to_date)) : ''}
                      </span>
                    </p>
                    {e.reason && <p className="mt-0.5 text-xs text-gray-500">{e.reason}</p>}
                    {/* #9 — motivo de rechazo */}
                    {e.status === 'rejected' && e.review_note && (
                      <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5">
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <p className="text-xs text-red-700">{e.review_note}</p>
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[e.status ?? 'pending'] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {STATUS_LABELS[e.status ?? 'pending'] ?? e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal solicitar corrección */}
      {modalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-base font-semibold text-gray-900">Solicitar corrección</h2>
            {/* #8 — fecha legible en el modal */}
            <p className="mb-4 text-sm text-gray-500">{fmtDateLong(modalSession.date)}</p>

            {/* #7 — resumen de la sesión en el modal */}
            <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs">
              <div>
                <p className="text-gray-400">Entrada</p>
                <p className="font-medium text-gray-700">{fmtTime(modalSession.started_at)}</p>
              </div>
              <div>
                <p className="text-gray-400">Salida</p>
                <p className="font-medium text-gray-700">
                  {modalSession.ended_at ? fmtTime(modalSession.ended_at) : 'Activa'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Duración</p>
                <p className="font-medium text-gray-700">
                  {fmtHours(sessionDuration(modalSession.started_at, modalSession.ended_at))}
                </p>
              </div>
            </div>

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
                    applies_to_date: modalSession.date,
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
                      setModalSession(null)
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
