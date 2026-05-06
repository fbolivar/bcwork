'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CalendarOff, Plus, X, Check, Clock, Trash2 } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacaciones',
  sick: 'Incapacidad',
  personal: 'Día personal',
  maternity: 'Licencia maternidad',
  paternity: 'Licencia paternidad',
  other: 'Otro',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

function daysBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.round(ms / 86400000) + 1
}

function formatDateShort(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function RequestModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils()
  const [type, setType] = useState<string>('vacation')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [notes, setNotes] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const mutation = trpc.employee.requestTimeOff.useMutation({
    onSuccess: () => {
      void utils.employee.getMyTimeOff.invalidate()
      onClose()
    },
  })

  const days = startsOn && endsOn && endsOn >= startsOn ? daysBetween(startsOn, endsOn) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Nueva solicitud de ausencia</h2>
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
            <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de ausencia</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Desde</label>
              <input
                type="date"
                value={startsOn}
                min={today}
                onChange={(e) => {
                  setStartsOn(e.target.value)
                  if (endsOn < e.target.value) setEndsOn(e.target.value)
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Hasta</label>
              <input
                type="date"
                value={endsOn}
                min={startsOn || today}
                onChange={(e) => setEndsOn(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {days > 0 && (
            <p className="text-xs text-blue-600">
              {days} día{days > 1 ? 's' : ''} de ausencia
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo o información adicional..."
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {mutation.isError && (
          <p className="mt-3 text-xs text-red-500">
            {mutation.error.message || 'Error al enviar la solicitud'}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!startsOn || !endsOn) return
              mutation.mutate({
                type: type as Parameters<typeof mutation.mutate>[0]['type'],
                starts_on: startsOn,
                ends_on: endsOn,
                notes: notes || undefined,
              })
            }}
            disabled={mutation.isPending || !startsOn || !endsOn}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Enviar solicitud
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

export function MyAbsencesPanel() {
  const [showModal, setShowModal] = useState(false)
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.employee.getMyTimeOff.useQuery()
  const cancelMutation = trpc.employee.cancelTimeOff.useMutation({
    onSuccess: () => void utils.employee.getMyTimeOff.invalidate(),
  })

  const rows = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mis ausencias</h1>
          <p className="mt-1 text-sm text-gray-500">
            Solicita vacaciones, incapacidades y días libres para aprobación de tu manager.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </button>
      </div>

      {isLoading && (
        <div className="flex h-32 items-center justify-center text-gray-400">Cargando...</div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <CalendarOff className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No tienes solicitudes registradas</p>
          <p className="mt-1 text-xs text-gray-400">
            Usa el botón &quot;Nueva solicitud&quot; para solicitar una ausencia
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Período</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Días</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Notas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {TYPE_LABELS[r.type] ?? r.type}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span>{formatDateShort(r.starts_on)}</span>
                    {r.starts_on !== r.ends_on && (
                      <>
                        <span className="mx-1 text-gray-400">→</span>
                        <span>{formatDateShort(r.ends_on)}</span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {daysBetween(r.starts_on, r.ends_on)}d
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[r.status ?? 'pending']
                      }`}
                    >
                      {r.status === 'pending' && <Clock className="h-3 w-3" />}
                      {r.status === 'approved' && <Check className="h-3 w-3" />}
                      {STATUS_LABELS[r.status ?? 'pending']}
                    </span>
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-xs text-gray-400">
                    {r.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        title="Cancelar solicitud"
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

      {showModal && <RequestModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
