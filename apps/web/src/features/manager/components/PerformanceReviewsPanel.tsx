'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Star, Plus, X, ClipboardCheck } from 'lucide-react'

const REVIEW_TYPE_LABELS: Record<string, string> = {
  quarterly: 'Trimestral',
  annual: 'Anual',
  probation: 'Período de prueba',
  pip: 'Plan de mejora',
}

const DEFAULT_QUESTIONS = [
  { id: 'q1', text: '¿Cómo evalúas el cumplimiento de objetivos?', type: 'rating' as const },
  { id: 'q2', text: '¿Cómo evalúas la calidad del trabajo?', type: 'rating' as const },
  { id: 'q3', text: '¿Cómo evalúas la comunicación y trabajo en equipo?', type: 'rating' as const },
  { id: 'q4', text: 'Fortalezas observadas en el período', type: 'text' as const },
  { id: 'q5', text: 'Áreas de mejora para el siguiente período', type: 'text' as const },
]

export function PerformanceReviewsPanel() {
  const utils = trpc.useUtils()
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  // Create form
  const [revieweeId, setRevieweeId] = useState('')
  const [reviewType, setReviewType] = useState<'quarterly' | 'annual' | 'probation' | 'pip'>(
    'quarterly',
  )
  const [periodLabel, setPeriodLabel] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Submit form
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [overallRating, setOverallRating] = useState(3)

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )

  const { data: reviews, isLoading } = trpc.manager.getTeamReviews.useQuery({ status: filter })
  const allReviews = (reviews ?? []) as any[]
  const reviewingReview = allReviews.find((r: any) => r.id === reviewingId)

  const create = trpc.manager.createReview.useMutation({
    onSuccess: () => {
      utils.manager.getTeamReviews.invalidate()
      setShowCreate(false)
      setRevieweeId('')
      setPeriodLabel('')
      setDueDate('')
    },
  })

  const submit = trpc.manager.submitReview.useMutation({
    onSuccess: () => {
      utils.manager.getTeamReviews.invalidate()
      setReviewingId(null)
      setAnswers({})
      setOverallRating(3)
    },
  })

  function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-6 w-6 ${n <= value ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
          >
            <Star className="h-full w-full fill-current" />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Evaluaciones de desempeño</h2>
          <p className="mt-0.5 text-sm text-gray-500">Reviews formales por período</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nueva evaluación
        </button>
      </div>

      <div className="flex gap-1.5">
        {(['all', 'pending', 'completed'] as const).map((s) => (
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
            {{ all: 'Todas', pending: 'Pendientes', completed: 'Completadas' }[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allReviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay evaluaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allReviews.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {(r.reviewee_name ?? r.reviewee_email ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">
                      {r.reviewee_name ?? r.reviewee_email}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        r.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {r.status === 'completed' ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {REVIEW_TYPE_LABELS[r.review_type] ?? r.review_type} · {r.period_label}
                    {r.due_date &&
                      ` · Vence ${new Date(r.due_date + 'T12:00:00').toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                      })}`}
                  </p>
                  {r.overall_rating != null && (
                    <div className="mt-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-3.5 w-3.5 ${n <= r.overall_rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {r.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => setReviewingId(r.id)}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Evaluar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nueva evaluación</h3>
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
                <label className="text-xs font-medium text-gray-700">Empleado</label>
                <select
                  value={revieweeId}
                  onChange={(e) => setRevieweeId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {(members ?? []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Tipo de evaluación</label>
                <select
                  value={reviewType}
                  onChange={(e) => setReviewType(e.target.value as typeof reviewType)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  {Object.entries(REVIEW_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Etiqueta del período</label>
                <input
                  type="text"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="Ej: Q1 2026, Ene-Mar 2026"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Fecha límite (opcional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
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
                disabled={!revieweeId || !periodLabel.trim() || create.isPending}
                onClick={() =>
                  create.mutate({
                    reviewee_id: revieweeId,
                    review_type: reviewType,
                    period_label: periodLabel,
                    due_date: dueDate || undefined,
                    questions: DEFAULT_QUESTIONS,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear evaluación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit review modal */}
      {reviewingId && reviewingReview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Evaluar a {reviewingReview.reviewee_name ?? reviewingReview.reviewee_email}
                </h3>
                <p className="text-xs text-gray-400">{reviewingReview.period_label}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingId(null)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {(reviewingReview.questions as any[]).map((q: any) => (
                <div key={q.id}>
                  <label className="text-sm font-medium text-gray-700">{q.text}</label>
                  {q.type === 'rating' ? (
                    <div className="mt-1.5">
                      <StarRating
                        value={Number(answers[q.id] ?? 3)}
                        onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
                      />
                    </div>
                  ) : (
                    <textarea
                      value={String(answers[q.id] ?? '')}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-gray-700">Calificación general</label>
                <div className="mt-1.5">
                  <StarRating value={overallRating} onChange={setOverallRating} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setReviewingId(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submit.isPending}
                onClick={() =>
                  submit.mutate({
                    id: reviewingId,
                    answers,
                    overall_rating: overallRating,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Enviar evaluación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-6 w-6 ${n <= value ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
        >
          <Star className="h-full w-full fill-current" />
        </button>
      ))}
    </div>
  )
}
