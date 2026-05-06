'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Star, ClipboardCheck, Clock, CheckCircle, X, ChevronRight } from 'lucide-react'

type Question = { text: string; type: 'rating' | 'text' | 'choice'; options?: string[] }
type Answer = { question_index: number; value: unknown }

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pendiente',
    color: 'bg-orange-100 text-orange-700',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  submitted: {
    label: 'Enviada',
    color: 'bg-blue-100 text-blue-700',
    icon: <ClipboardCheck className="h-3.5 w-3.5" />,
  },
  acknowledged: {
    label: 'Completada',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
}

const TYPE_LABELS: Record<string, string> = {
  self: 'Autoevaluación',
  manager: 'Evaluación del manager',
  peer: 'Evaluación entre pares',
}

function ReviewModal({
  review,
  onClose,
  onSubmit,
}: {
  review: {
    id: string
    period_label: string
    review_type: string
    questions: unknown
    reviewee?: { full_name: string } | null
  }
  onClose: () => void
  onSubmit: (answers: Answer[], rating: number) => void
}) {
  const questions = (review.questions as Question[]) ?? []
  const [answers, setAnswers] = useState<Record<number, unknown>>({})
  const [rating, setRating] = useState(0)

  const allAnswered =
    questions.every((_, i) => answers[i] !== undefined && answers[i] !== '') && rating > 0

  function setAnswer(idx: number, val: unknown) {
    setAnswers((prev) => ({ ...prev, [idx]: val }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {TYPE_LABELS[review.review_type]}
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">
              {review.period_label}
              {review.reviewee ? ` · ${review.reviewee.full_name}` : ''}
            </p>
          </div>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {questions.map((q, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-gray-800">
                {i + 1}. {q.text}
              </p>
              {q.type === 'rating' && (
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAnswer(i, n)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${answers[i] === n ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 text-gray-500 hover:border-blue-300'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'text' && (
                <textarea
                  rows={2}
                  placeholder="Tu respuesta..."
                  value={(answers[i] as string) ?? ''}
                  onChange={(e) => setAnswer(i, e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {q.type === 'choice' && (
                <div className="mt-2 space-y-1.5">
                  {(q.options ?? []).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswer(i, opt)}
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${answers[i] === opt ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <div
                        className={`h-3.5 w-3.5 rounded-full border-2 ${answers[i] === opt ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}
                      />
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div>
            <p className="text-sm font-medium text-gray-800">Calificación general</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  title={`Calificar ${n}`}
                  onClick={() => setRating(n)}
                  className={`transition-colors ${n <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
                >
                  <Star className="h-7 w-7 fill-current" />
                </button>
              ))}
            </div>
          </div>
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
            disabled={!allAnswered}
            onClick={() =>
              onSubmit(
                Object.entries(answers).map(([idx, val]) => ({
                  question_index: Number(idx),
                  value: val,
                })),
                rating,
              )
            }
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Enviar evaluación
          </button>
        </div>
      </div>
    </div>
  )
}

export function MyPerformanceReviewsPanel() {
  const utils = trpc.useUtils()
  const [activeReview, setActiveReview] = useState<null | {
    id: string
    period_label: string
    review_type: string
    questions: unknown
    reviewee?: { full_name: string } | null
  }>(null)

  const { data: reviews, isLoading } = trpc.employee.getMyPerformanceReviews.useQuery()

  const submit = trpc.employee.submitReview.useMutation({
    onSuccess: () => {
      utils.employee.getMyPerformanceReviews.invalidate()
      setActiveReview(null)
    },
  })
  const acknowledge = trpc.employee.acknowledgeReview.useMutation({
    onSuccess: () => utils.employee.getMyPerformanceReviews.invalidate(),
  })

  const allReviews = (reviews ?? []) as any[]
  const toFill = allReviews.filter((r: any) => r.status === 'pending')
  const submitted = allReviews.filter((r: any) => r.status === 'submitted')
  const completed = allReviews.filter((r: any) => r.status === 'acknowledged')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Evaluaciones de desempeño</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Tus autoevaluaciones y evaluaciones recibidas
        </p>
      </div>

      {!isLoading && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
            <p className="text-xs text-orange-600">Pendientes</p>
            <p className="mt-0.5 text-2xl font-bold text-orange-700">{toFill.length}</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
            <p className="text-xs text-green-600">Completadas</p>
            <p className="mt-0.5 text-2xl font-bold text-green-700">{completed.length}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (reviews ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <Star className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No hay evaluaciones asignadas</p>
          <p className="mt-1 text-xs text-gray-400">Tu manager las creará periódicamente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allReviews.map((r: any) => {
            const st = STATUS_MAP[r.status as string] ?? STATUS_MAP.pending
            const reviewee = r.reviewee as
              | { id: string; full_name: string; position: string | null }
              | null
              | undefined
            const reviewer = r.reviewer as { id: string; full_name: string } | null | undefined
            return (
              <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {TYPE_LABELS[r.review_type] ?? r.review_type}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {r.period_label}
                      {reviewee && ` · Sobre: ${reviewee.full_name}`}
                      {reviewer && ` · De: ${reviewer.full_name}`}
                      {r.due_date &&
                        ` · Vence: ${new Date(r.due_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`}
                    </p>
                    {r.overall_rating && r.status !== 'pending' && (
                      <div className="mt-1 flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-3.5 w-3.5 fill-current ${n <= (r.overall_rating ?? 0) ? 'text-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${st?.color ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {st?.icon}
                    {st?.label ?? r.status}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  {r.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveReview({
                          id: r.id,
                          period_label: r.period_label,
                          review_type: r.review_type,
                          questions: r.questions,
                          reviewee,
                        })
                      }
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                      Completar evaluación
                    </button>
                  )}
                  {r.status === 'submitted' && r.reviewee?.full_name === undefined && (
                    <button
                      type="button"
                      onClick={() => acknowledge.mutate({ review_id: r.id })}
                      disabled={acknowledge.isPending}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-green-200 py-2 text-xs font-medium text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Confirmar evaluación
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeReview && (
        <ReviewModal
          review={activeReview}
          onClose={() => setActiveReview(null)}
          onSubmit={(answers, rating) =>
            submit.mutate({ review_id: activeReview.id, answers, overall_rating: rating })
          }
        />
      )}
    </div>
  )
}
