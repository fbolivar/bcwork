'use client'

import { useState, useMemo } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CheckCircle2, XCircle, Clock, AlertCircle, CheckSquare } from 'lucide-react'

const EDIT_TYPE_LABELS: Record<string, string> = {
  missed_session: 'Sesión no registrada',
  wrong_app: 'Aplicación incorrecta',
  duration_error: 'Error en duración',
  other: 'Otro motivo',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

type Filter = 'pending' | 'approved' | 'rejected' | 'all'
type DatePreset = 'all' | 'week' | 'month'

type ReviewModal = {
  ids: string[]
  label: string
  status: 'approved' | 'rejected'
}

function getDateRange(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  if (preset === 'all') return {}
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  if (preset === 'week') {
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    return { dateFrom: monday.toISOString().slice(0, 10), dateTo: todayStr }
  }
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  return { dateFrom: firstDay.toISOString().slice(0, 10), dateTo: todayStr }
}

export function CorrectionsPanel() {
  const [filter, setFilter] = useState<Filter>('pending')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [modal, setModal] = useState<ReviewModal | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [done, setDone] = useState(false)

  const utils = trpc.useUtils()
  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset])

  const { data: edits = [], isLoading } = trpc.manager.getActivityEdits.useQuery({
    status: filter,
    ...dateRange,
  })

  const pendingEdits = useMemo(() => edits.filter((e) => e.status === 'pending'), [edits])
  const allPendingSelected =
    pendingEdits.length > 0 && pendingEdits.every((e) => selectedIds.includes(e.id))

  const review = trpc.manager.reviewActivityEdit.useMutation({
    onSuccess: () => {
      void utils.manager.getActivityEdits.invalidate()
      void utils.manager.getPendingCorrectionsCount.invalidate()
      setDone(true)
      setTimeout(() => {
        setModal(null)
        setReviewNote('')
        setSelectedIds([])
        setDone(false)
      }, 1500)
    },
  })

  const bulkReview = trpc.manager.bulkReviewActivityEdits.useMutation({
    onSuccess: () => {
      void utils.manager.getActivityEdits.invalidate()
      void utils.manager.getPendingCorrectionsCount.invalidate()
      setDone(true)
      setTimeout(() => {
        setModal(null)
        setReviewNote('')
        setSelectedIds([])
        setDone(false)
      }, 1500)
    },
  })

  const tabs: { value: Filter; label: string }[] = [
    { value: 'pending', label: 'Pendientes' },
    { value: 'approved', label: 'Aprobadas' },
    { value: 'rejected', label: 'Rechazadas' },
    { value: 'all', label: 'Todas' },
  ]

  const datePresets: { value: DatePreset; label: string }[] = [
    { value: 'all', label: 'Todo' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
  ]

  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleAll() {
    if (allPendingSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingEdits.map((e) => e.id))
    }
  }

  function openBulkModal(status: 'approved' | 'rejected') {
    setModal({ ids: selectedIds, label: `${selectedIds.length} solicitudes`, status })
  }

  function openSingleModal(id: string, label: string, status: 'approved' | 'rejected') {
    setModal({ ids: [id], label, status })
  }

  function confirmReview() {
    if (!modal) return
    if (modal.ids.length === 1) {
      review.mutate({
        id: modal.ids[0]!,
        status: modal.status,
        review_note: reviewNote || undefined,
      })
    } else {
      bulkReview.mutate({
        ids: modal.ids,
        status: modal.status,
        review_note: reviewNote || undefined,
      })
    }
  }

  const isPending = review.isPending || bulkReview.isPending
  const mutationError = review.error ?? bulkReview.error

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Solicitudes de corrección</h1>
        <p className="mt-1 text-sm text-gray-500">
          Revisa y aprueba o rechaza las solicitudes de tus empleados
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setFilter(t.value)
                setSelectedIds([])
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === t.value ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {datePresets.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setDatePreset(p.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                datePreset === p.value
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.length} seleccionada{selectedIds.length > 1 ? 's' : ''}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => openBulkModal('approved')}
              className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aprobar todas
            </button>
            <button
              type="button"
              onClick={() => openBulkModal('rejected')}
              className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              <XCircle className="h-3.5 w-3.5" />
              Rechazar todas
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading && <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />}

      {!isLoading && edits.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-16">
          <CheckCircle2 className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">
            {filter === 'pending'
              ? 'No hay solicitudes pendientes'
              : 'Sin solicitudes en esta categoría'}
          </p>
        </div>
      )}

      {edits.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {filter === 'pending' && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      title="Seleccionar todas las pendientes"
                      checked={allPendingSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left font-medium text-gray-500">Empleado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Razón</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Solicitado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {edits.map((e) => {
                const isSelected = selectedIds.includes(e.id)
                return (
                  <tr
                    key={e.id}
                    className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50/40' : ''}`}
                  >
                    {filter === 'pending' && (
                      <td className="px-4 py-3">
                        {e.status === 'pending' && (
                          <input
                            type="checkbox"
                            title="Seleccionar"
                            checked={isSelected}
                            onChange={() => toggleRow(e.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{e.full_name ?? e.email}</p>
                      <p className="text-xs text-gray-400">{e.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {fmtDate(String(e.applies_to_date ?? ''))}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {EDIT_TYPE_LABELS[e.edit_type] ?? e.edit_type}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate text-xs text-gray-500">{e.reason ?? '—'}</p>
                      {e.review_note && (
                        <p className="mt-0.5 truncate text-xs text-blue-500">
                          Nota: {e.review_note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(e.created_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[e.status ?? 'pending'] ?? 'border-gray-200 bg-gray-100 text-gray-600'}`}
                      >
                        {STATUS_LABELS[e.status ?? 'pending'] ?? e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              openSingleModal(e.id, e.full_name ?? e.email, 'approved')
                            }
                            className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openSingleModal(e.id, e.full_name ?? e.email, 'rejected')
                            }
                            className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de revisión (single o bulk) */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {done ? (
              <div className="flex flex-col items-center py-6">
                {modal.status === 'approved' ? (
                  <CheckCircle2 className="mb-2 h-10 w-10 text-green-500" />
                ) : (
                  <XCircle className="mb-2 h-10 w-10 text-red-500" />
                )}
                <p className="text-sm font-medium text-gray-900">
                  {modal.ids.length > 1
                    ? `${modal.ids.length} solicitudes ${modal.status === 'approved' ? 'aprobadas' : 'rechazadas'}`
                    : `Solicitud ${modal.status === 'approved' ? 'aprobada' : 'rechazada'}`}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {modal.ids.length > 1
                    ? 'Los empleados han sido notificados.'
                    : 'El empleado ha sido notificado.'}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-900">
                    {modal.status === 'approved' ? 'Aprobar' : 'Rechazar'}{' '}
                    {modal.ids.length > 1 ? `${modal.ids.length} solicitudes` : 'solicitud'}
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-500">{modal.label}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="review-note"
                      className="mb-1 block text-xs font-medium text-gray-600"
                    >
                      Nota{' '}
                      {modal.status === 'rejected' ? (
                        <span className="text-gray-400">(recomendado)</span>
                      ) : (
                        <span className="text-gray-400">(opcional)</span>
                      )}
                    </label>
                    <textarea
                      id="review-note"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={
                        modal.status === 'rejected'
                          ? 'Explica por qué se rechaza la solicitud...'
                          : 'Nota opcional para el empleado...'
                      }
                    />
                  </div>

                  {mutationError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <p className="text-sm text-red-600">{mutationError.message}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModal(null)
                        setReviewNote('')
                      }}
                      className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmReview}
                      disabled={isPending}
                      className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                        modal.status === 'approved'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {isPending
                        ? 'Guardando...'
                        : modal.status === 'approved'
                          ? 'Confirmar aprobación'
                          : 'Confirmar rechazo'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
