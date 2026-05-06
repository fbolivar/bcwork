'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'

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

type ReviewModal = {
  id: string
  userName: string
  date: string
  editType: string
  reason: string | null
}

export function CorrectionsPanel() {
  const [filter, setFilter] = useState<Filter>('pending')
  const [modal, setModal] = useState<ReviewModal | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved')
  const [reviewNote, setReviewNote] = useState('')
  const [done, setDone] = useState(false)

  const utils = trpc.useUtils()
  const { data: edits = [], isLoading } = trpc.manager.getActivityEdits.useQuery({ status: filter })
  const review = trpc.manager.reviewActivityEdit.useMutation({
    onSuccess: () => {
      void utils.manager.getActivityEdits.invalidate()
      void utils.manager.getPendingCorrectionsCount.invalidate()
      setDone(true)
      setTimeout(() => {
        setModal(null)
        setReviewNote('')
        setDone(false)
      }, 1800)
    },
  })

  const tabs: { value: Filter; label: string }[] = [
    { value: 'pending', label: 'Pendientes' },
    { value: 'approved', label: 'Aprobadas' },
    { value: 'rejected', label: 'Rechazadas' },
    { value: 'all', label: 'Todas' },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Solicitudes de corrección</h1>
        <p className="mt-1 text-sm text-gray-500">
          Revisa y aprueba o rechaza las solicitudes de tus empleados
        </p>
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setFilter(t.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === t.value ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
              {edits.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
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
                      <p className="mt-0.5 truncate text-xs text-blue-500">Nota: {e.review_note}</p>
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
                          onClick={() => {
                            setReviewStatus('approved')
                            setModal({
                              id: e.id,
                              userName: e.full_name ?? e.email,
                              date: String(e.applies_to_date ?? ''),
                              editType: EDIT_TYPE_LABELS[e.edit_type] ?? e.edit_type,
                              reason: e.reason,
                            })
                          }}
                          className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewStatus('rejected')
                            setModal({
                              id: e.id,
                              userName: e.full_name ?? e.email,
                              date: String(e.applies_to_date ?? ''),
                              editType: EDIT_TYPE_LABELS[e.edit_type] ?? e.edit_type,
                              reason: e.reason,
                            })
                          }}
                          className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rechazar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de revisión */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {done ? (
              <div className="flex flex-col items-center py-6">
                {reviewStatus === 'approved' ? (
                  <CheckCircle2 className="mb-2 h-10 w-10 text-green-500" />
                ) : (
                  <XCircle className="mb-2 h-10 w-10 text-red-500" />
                )}
                <p className="text-sm font-medium text-gray-900">
                  Solicitud {reviewStatus === 'approved' ? 'aprobada' : 'rechazada'}
                </p>
                <p className="mt-1 text-xs text-gray-500">El empleado ha sido notificado.</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-900">
                    {reviewStatus === 'approved' ? 'Aprobar' : 'Rechazar'} solicitud
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-500">{modal.userName}</p>
                </div>

                {/* Resumen de la solicitud */}
                <div className="mb-4 space-y-1.5 rounded-xl bg-gray-50 p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fecha</span>
                    <span className="font-medium text-gray-700">
                      {new Date(modal.date).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tipo</span>
                    <span className="font-medium text-gray-700">{modal.editType}</span>
                  </div>
                  {modal.reason && (
                    <div className="flex justify-between gap-4">
                      <span className="shrink-0 text-gray-400">Razón</span>
                      <span className="text-right text-gray-700">{modal.reason}</span>
                    </div>
                  )}
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    review.mutate({
                      id: modal.id,
                      status: reviewStatus,
                      review_note: reviewNote || undefined,
                    })
                  }}
                >
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Nota {reviewStatus === 'rejected' ? '(recomendado)' : '(opcional)'}
                    </label>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={
                        reviewStatus === 'rejected'
                          ? 'Explica por qué se rechaza la solicitud...'
                          : 'Nota opcional para el empleado...'
                      }
                    />
                  </div>

                  {review.error && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <p className="text-sm text-red-600">{review.error.message}</p>
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
                      type="submit"
                      disabled={review.isPending}
                      className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                        reviewStatus === 'approved'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {review.isPending
                        ? 'Guardando...'
                        : reviewStatus === 'approved'
                          ? 'Confirmar aprobación'
                          : 'Confirmar rechazo'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
