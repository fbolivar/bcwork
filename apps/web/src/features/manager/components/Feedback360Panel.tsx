'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { MessageCircle, Plus, X, Star } from 'lucide-react'

const RELATIONSHIP_LABELS: Record<string, string> = {
  manager: 'Manager → Empleado',
  peer: 'Entre pares',
  upward: 'Empleado → Manager',
  self: 'Autoevaluación',
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  manager: 'bg-blue-100 text-blue-700',
  peer: 'bg-purple-100 text-purple-700',
  upward: 'bg-orange-100 text-orange-700',
  self: 'bg-gray-100 text-gray-600',
}

const RATING_DIMENSIONS = [
  { id: 'execution', label: 'Ejecución y resultados' },
  { id: 'communication', label: 'Comunicación' },
  { id: 'teamwork', label: 'Trabajo en equipo' },
  { id: 'initiative', label: 'Iniciativa y proactividad' },
  { id: 'growth', label: 'Aprendizaje y crecimiento' },
]

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          className={`${n <= value ? 'text-yellow-400' : 'text-gray-200'} ${onChange ? 'hover:text-yellow-400' : ''}`}
        >
          <Star className="h-4 w-4 fill-current" />
        </button>
      ))}
    </div>
  )
}

export function Feedback360Panel() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState('')

  const [toUserId, setToUserId] = useState('')
  const [relationship, setRelationship] = useState<'manager' | 'peer' | 'upward' | 'self'>(
    'manager',
  )
  const [periodLabel, setPeriodLabel] = useState('')
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [message, setMessage] = useState('')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )

  const { data: feedback, isLoading } = trpc.manager.getTeamFeedback360.useQuery({
    period_label: filterPeriod || undefined,
  })
  const allFeedback = (feedback ?? []) as any[]

  const periods = [...new Set(allFeedback.map((f: any) => f.period_label))].slice(0, 10)

  const send = trpc.manager.sendFeedback360.useMutation({
    onSuccess: () => {
      utils.manager.getTeamFeedback360.invalidate()
      setShowCreate(false)
      setToUserId('')
      setPeriodLabel('')
      setRatings({})
      setMessage('')
    },
  })

  // Group by recipient for aggregated view
  const byRecipient = allFeedback.reduce((acc: Record<string, any[]>, f: any) => {
    if (!acc[f.to_user_id]) acc[f.to_user_id] = []
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    acc[f.to_user_id]!.push(f)
    return acc
  }, {})

  function avgRating(feedbacks: any[], dim: string): number | null {
    const vals = feedbacks.map((f) => f.ratings?.[dim]).filter((v) => v != null && !isNaN(v))
    if (vals.length === 0) return null
    return vals.reduce((a: number, b: number) => a + b, 0) / vals.length
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Feedback 360°</h2>
          <p className="mt-0.5 text-sm text-gray-500">Evaluación multidireccional del equipo</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Dar feedback
        </button>
      </div>

      {/* Period filter */}
      {periods.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilterPeriod('')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !filterPeriod
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPeriod(p as string)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterPeriod === p
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {p as string}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : Object.keys(byRecipient).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay feedback registrado</p>
          <p className="mt-1 text-xs text-gray-400">Comienza dando feedback 360° a tu equipo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byRecipient).map(([uid, feedbacks]) => {
            const first = (feedbacks as any[])[0]
            return (
              <div key={uid} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {first.to_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{first.to_name}</p>
                    <p className="text-[10px] text-gray-400">
                      {(feedbacks as any[]).length} evaluaciones recibidas
                    </p>
                  </div>
                </div>
                {/* Aggregated ratings per dimension */}
                <div className="divide-y divide-gray-50 px-4 py-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 pb-3">
                    {RATING_DIMENSIONS.map((dim) => {
                      const avg = avgRating(feedbacks as any[], dim.id)
                      return (
                        <div key={dim.id} className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{dim.label}</span>
                          {avg !== null ? (
                            <div className="flex items-center gap-1">
                              <StarRating value={Math.round(avg)} />
                              <span className="text-[10px] text-gray-400">{avg.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-300">—</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* Individual feedbacks */}
                  <div className="space-y-2 pt-3">
                    {(feedbacks as any[]).map((f: any) => (
                      <div key={f.id} className="flex items-start gap-2">
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${RELATIONSHIP_COLORS[f.relationship] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {RELATIONSHIP_LABELS[f.relationship] ?? f.relationship}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-gray-400">{f.from_name}</p>
                          {f.message && <p className="text-xs text-gray-600">{f.message}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Dar feedback 360°</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Para</label>
                <select
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar empleado...</option>
                  {(members ?? []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Tipo de feedback</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as typeof relationship)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Período</label>
                <input
                  type="text"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="Ej: Q1 2026, Mayo 2026"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Dimensiones</label>
                <div className="mt-1.5 space-y-2">
                  {RATING_DIMENSIONS.map((dim) => (
                    <div key={dim.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{dim.label}</span>
                      <StarRating
                        value={ratings[dim.id] ?? 0}
                        onChange={(v) => setRatings({ ...ratings, [dim.id]: v })}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Comentario (opcional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Observaciones cualitativas..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  !toUserId ||
                  !periodLabel.trim() ||
                  Object.keys(ratings).length === 0 ||
                  send.isPending
                }
                onClick={() =>
                  send.mutate({
                    to_user_id: toUserId,
                    relationship,
                    period_label: periodLabel,
                    ratings,
                    message: message || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Enviar feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
