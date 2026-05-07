'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { MessageCircle, Plus, X, Check, Star, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  completed: { label: 'Completado', color: 'text-green-700', bg: 'bg-green-100' },
  declined: { label: 'Rechazado', color: 'text-red-700', bg: 'bg-red-100' },
}

export function MyFeedbackRequestPanel() {
  const utils = trpc.useUtils()
  const [showRequest, setShowRequest] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [requestNote, setRequestNote] = useState('')
  const [tab, setTab] = useState<'sent' | 'received'>('received')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: sentData, isLoading: loadingSent } = trpc.employee.getMyFeedbackRequests.useQuery()
  const { data: receivedData, isLoading: loadingReceived } =
    trpc.employee.getMyReceivedFeedback.useQuery()
  const { data: teammates } = trpc.employee.getMyTeammates.useQuery()

  const request = trpc.employee.requestFeedback.useMutation({
    onSuccess: () => {
      utils.employee.getMyFeedbackRequests.invalidate()
      setShowRequest(false)
      setSelectedIds([])
      setRequestNote('')
    },
  })
  const acknowledge = trpc.employee.acknowledgeReceivedFeedback.useMutation({
    onSuccess: () => utils.employee.getMyFeedbackRequests.invalidate(),
  })

  const sent = (sentData ?? []) as any[]
  const received = (receivedData ?? []) as any[]
  const team = (teammates ?? []) as any[]

  function togglePeer(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const newCount = received.filter((r: any) => !r.requester_acknowledged).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Feedback 360°</h2>
          <p className="mt-0.5 text-sm text-gray-500">Solicita y recibe feedback de compañeros</p>
        </div>
        <button
          type="button"
          onClick={() => setShowRequest(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Solicitar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab('received')}
          className={`relative flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${tab === 'received' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Recibido
          {newCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {newCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('sent')}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${tab === 'sent' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Enviado ({sent.length})
        </button>
      </div>

      {tab === 'received' && (
        <>
          {loadingReceived ? (
            <div className="animate-pulse space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : received.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <Star className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Aún no has recibido feedback</p>
              <p className="mt-1 text-xs text-gray-400">Solicita feedback a tus compañeros</p>
            </div>
          ) : (
            <div className="space-y-3">
              {received.map((r: any) => (
                <div key={r.id} className="rounded-xl border border-gray-100 bg-white">
                  <div
                    className="flex cursor-pointer items-center gap-3 px-4 py-3"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                      {(r.reviewer?.full_name ?? r.reviewer?.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {r.reviewer?.full_name ?? r.reviewer?.email ?? 'Compañero'}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(r.created_at).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    {expandedId === r.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-300" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  {expandedId === r.id && (
                    <div className="border-t border-gray-50 px-4 pb-3 pt-2">
                      <p className="text-sm leading-relaxed text-gray-700">
                        {r.feedback_text ?? 'Sin texto de feedback'}
                      </p>
                      {!r.requester_acknowledged && (
                        <button
                          type="button"
                          onClick={() => acknowledge.mutate({ id: r.id })}
                          className="mt-2 flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                          <Check className="h-3.5 w-3.5" /> Marcar como leído
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'sent' && (
        <>
          {loadingSent ? (
            <div className="animate-pulse space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : sent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No has enviado solicitudes de feedback</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Compañero</th>
                    <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                    <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {sent.map((r: any) => {
                    const sc = (STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ??
                      STATUS_CONFIG.pending)!
                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                              {(r.reviewer?.full_name ?? r.reviewer?.email ?? '?')
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-700">
                              {r.reviewer?.full_name ?? r.reviewer?.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.color}`}
                          >
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString('es-CO')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Request modal */}
      {showRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Solicitar feedback</h3>
              <button
                type="button"
                onClick={() => setShowRequest(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Selecciona compañeros</label>
                <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                  {team.length === 0 ? (
                    <p className="text-xs text-gray-400">No hay compañeros de equipo disponibles</p>
                  ) : (
                    team.map((m: any) => (
                      <label
                        key={m.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(m.id)}
                          onChange={() => togglePeer(m.id)}
                          className="h-3.5 w-3.5 rounded"
                        />
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                          {(m.full_name ?? m.email ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800">
                            {m.full_name ?? m.email}
                          </p>
                          {m.department && (
                            <p className="text-[10px] text-gray-400">{m.department}</p>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Contexto (opcional)</label>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  rows={2}
                  placeholder="Ej: feedback sobre el proyecto X, presentaciones, trabajo en equipo..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowRequest(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0 || request.isPending}
                onClick={() =>
                  request.mutate({
                    reviewer_ids: selectedIds,
                    request_note: requestNote || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Enviar solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
