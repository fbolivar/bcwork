'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, Clock, X, Check, Trash2, ClipboardList } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  meeting: 'Reunión',
  call: 'Llamada',
  travel: 'Desplazamiento',
  training: 'Capacitación',
  offline_work: 'Trabajo offline',
  other: 'Otro',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDuration(mins: number | null) {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDateShort(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function NewEntryModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils()
  const [date, setDate] = useState(today())
  const [startedAt, setStartedAt] = useState('')
  const [endedAt, setEndedAt] = useState('')
  const [type, setType] = useState('meeting')
  const [description, setDescription] = useState('')

  const mutation = trpc.employee.createManualTimeEntry.useMutation({
    onSuccess: () => {
      void utils.employee.getMyManualTimeEntries.invalidate()
      onClose()
    },
  })

  const durationMins =
    startedAt && endedAt && endedAt > startedAt
      ? Math.round(
          (new Date(`2000-01-01T${endedAt}`).getTime() -
            new Date(`2000-01-01T${startedAt}`).getTime()) /
            60000,
        )
      : 0

  const canSubmit = date && startedAt && endedAt && endedAt > startedAt && description.length >= 5

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Registrar tiempo manual</h2>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Tipo de actividad
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Fecha</label>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Hora inicio</label>
              <input
                type="time"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Hora fin</label>
              <input
                type="time"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {durationMins > 0 && (
            <p className="text-xs font-medium text-blue-600">
              Duración: {fmtDuration(durationMins)}
              {durationMins > 480 && (
                <span className="ml-2 text-red-500">máximo 8 horas por entrada</span>
              )}
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Descripción <span className="text-gray-400">(mínimo 5 caracteres)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Reunión de planificación sprint con equipo de producto..."
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-0.5 text-right text-[10px] text-gray-400">{description.length}/500</p>
          </div>
        </div>

        {mutation.isError && (
          <p className="mt-3 text-xs text-red-500">
            {mutation.error.message || 'Error al guardar'}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!canSubmit) return
              mutation.mutate({
                entry_date: date,
                started_at: startedAt,
                ended_at: endedAt,
                entry_type: type as Parameters<typeof mutation.mutate>[0]['entry_type'],
                description,
              })
            }}
            disabled={mutation.isPending || !canSubmit || durationMins > 480}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Clock className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Registrar tiempo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export function MyManualTimePanel() {
  const [showModal, setShowModal] = useState(false)
  const [days, setDays] = useState(30)
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.employee.getMyManualTimeEntries.useQuery({ days })
  const cancelMutation = trpc.employee.cancelManualTimeEntry.useMutation({
    onSuccess: () => void utils.employee.getMyManualTimeEntries.invalidate(),
  })

  const rows = data ?? []
  const totalApproved = rows
    .filter((r) => r.status === 'approved')
    .reduce((s, r) => s + (r.duration_minutes ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tiempo manual</h1>
          <p className="mt-1 text-sm text-gray-500">
            Registra reuniones, llamadas y trabajo offline que el agente no pudo capturar
            automáticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Registrar tiempo
        </button>
      </div>

      {/* Resumen */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Registradas',
              value: rows.length,
              color: 'text-gray-800 bg-gray-50 border-gray-200',
            },
            {
              label: 'Pendientes',
              value: rows.filter((r) => r.status === 'pending').length,
              color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
            },
            {
              label: 'Horas aprobadas',
              value: fmtDuration(totalApproved),
              color: 'text-green-700 bg-green-50 border-green-200',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border p-3 ${color}`}>
              <p className="text-xs opacity-70">{label}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtro */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Mostrar últimos:</span>
        {[7, 30, 60, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex h-32 items-center justify-center text-gray-400">Cargando...</div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Sin registros en este período</p>
          <p className="mt-1 text-xs text-gray-400">
            Usa el botón &quot;Registrar tiempo&quot; para añadir actividad offline
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Horario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Duración</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Descripción</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-600">{fmtDateShort(r.entry_date)}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {TYPE_LABELS[r.entry_type] ?? r.entry_type}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {r.started_at.slice(0, 5)} – {r.ended_at.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {fmtDuration(r.duration_minutes)}
                  </td>
                  <td className="max-w-48 px-4 py-3">
                    <p className="truncate text-xs text-gray-600">{r.description}</p>
                    {r.review_note && (
                      <p className="mt-0.5 truncate text-[10px] italic text-gray-400">
                        Nota: {r.review_note}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[r.status ?? 'pending']
                      }`}
                    >
                      {STATUS_LABELS[r.status ?? 'pending']}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        title="Cancelar registro"
                        onClick={() => cancelMutation.mutate({ id: r.id })}
                        disabled={cancelMutation.isPending}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700">
        <strong>Proceso de aprobación:</strong> Cada entrada queda en estado pendiente hasta que tu
        manager la revise. Las horas aprobadas se suman a tu registro de tiempo laboral.
      </div>

      {showModal && <NewEntryModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
