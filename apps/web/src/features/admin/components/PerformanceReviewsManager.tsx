'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Star, Plus, X, ClipboardCheck, Eye } from 'lucide-react'

type ReviewType = 'self' | 'manager' | 'peer'
type QuestionType = 'rating' | 'text' | 'choice'
type Question = { text: string; type: QuestionType; options?: string[] }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-orange-100 text-orange-700' },
  submitted: { label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  acknowledged: { label: 'Completada', color: 'bg-green-100 text-green-700' },
}

const TYPE_LABELS: Record<ReviewType, string> = {
  self: 'Autoevaluación',
  manager: 'Por manager',
  peer: 'Entre pares',
}

const DEFAULT_QUESTIONS: Question[] = [
  { text: '¿Cómo evalúas tu desempeño general este período?', type: 'rating' },
  { text: '¿Cuáles fueron tus principales logros?', type: 'text' },
  { text: '¿En qué áreas necesitas mejorar?', type: 'text' },
]

type Response = {
  question_index: number
  rating?: number
  text?: string
  choice?: string
}

function SubmitReviewModal({ review, onClose }: { review: any; onClose: () => void }) {
  const utils = trpc.useUtils()
  const questions: Question[] = (review.questions as Question[]) ?? []
  const [responses, setResponses] = useState<Response[]>(
    questions.map((_, i) => ({ question_index: i })),
  )

  const submit = trpc.admin.submitPerformanceReview.useMutation({
    onSuccess: () => {
      utils.admin.listPerformanceReviews.invalidate()
      onClose()
    },
  })

  function setResponse(index: number, patch: Partial<Response>) {
    setResponses((prev) => prev.map((r) => (r.question_index === index ? { ...r, ...patch } : r)))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Completar evaluación</h3>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {review.reviewee?.full_name} · {review.period_label}
        </p>

        <div className="mt-4 space-y-4">
          {questions.map((q, i) => {
            const resp = responses[i] ?? { question_index: i }
            return (
              <div key={i}>
                <p className="text-xs font-medium text-gray-700">
                  {i + 1}. {q.text}
                </p>
                {q.type === 'rating' && (
                  <div className="mt-1.5 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        title={`${n} estrellas`}
                        onClick={() => setResponse(i, { rating: n })}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            n <= (resp.rating ?? 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-200 hover:text-yellow-300'
                          }`}
                        />
                      </button>
                    ))}
                    {resp.rating && (
                      <span className="ml-2 self-center text-xs text-gray-400">
                        {resp.rating}/5
                      </span>
                    )}
                  </div>
                )}
                {q.type === 'text' && (
                  <textarea
                    rows={3}
                    value={resp.text ?? ''}
                    onChange={(e) => setResponse(i, { text: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tu respuesta..."
                  />
                )}
                {q.type === 'choice' && q.options && (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setResponse(i, { choice: opt })}
                        className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                          resp.choice === opt
                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submit.isPending}
            onClick={() => submit.mutate({ review_id: review.id, responses })}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Enviar evaluación
          </button>
        </div>
      </div>
    </div>
  )
}

export function PerformanceReviewsManager() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState<any | null>(null)
  const [revieweeId, setRevieweeId] = useState('')
  const [reviewerId, setReviewerId] = useState('')
  const [reviewType, setReviewType] = useState<ReviewType>('self')
  const [periodLabel, setPeriodLabel] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS)
  const [newQText, setNewQText] = useState('')
  const [newQType, setNewQType] = useState<QuestionType>('text')
  const [filterEmployee, setFilterEmployee] = useState('')

  const { data: reviews, isLoading } = trpc.admin.listPerformanceReviews.useQuery({
    employee_id: filterEmployee || undefined,
  })
  const { data: usersData } = trpc.admin.listUsers.useQuery({ pageSize: 100 })

  const create = trpc.admin.createPerformanceReview.useMutation({
    onSuccess: () => {
      utils.admin.listPerformanceReviews.invalidate()
      setShowCreate(false)
      setRevieweeId('')
      setReviewerId('')
      setPeriodLabel('')
      setDueDate('')
      setQuestions(DEFAULT_QUESTIONS)
    },
  })

  function addQuestion() {
    if (!newQText.trim()) return
    setQuestions((prev) => [...prev, { text: newQText.trim(), type: newQType }])
    setNewQText('')
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Evaluaciones de desempeño</h2>
          <p className="mt-0.5 text-sm text-gray-500">Crea y gestiona ciclos de evaluación 360°</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva evaluación
        </button>
      </div>

      <div className="flex gap-2">
        <select
          title="Filtrar por empleado"
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todos los empleados</option>
          {(usersData?.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : ((reviews ?? []) as any[]).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay evaluaciones creadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {((reviews ?? []) as any[]).map((raw) => {
            type ReviewRow = {
              id: string
              period_label: string
              review_type: string
              status: string
              due_date: string | null
              overall_rating: number | null
              questions: Question[]
              reviewee?: { full_name: string } | null
              reviewer?: { full_name: string } | null
            }
            const r = raw as ReviewRow
            const st = STATUS_MAP[r.status] ?? STATUS_MAP.pending
            return (
              <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {r.reviewee?.full_name ?? '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {TYPE_LABELS[r.review_type as ReviewType] ?? r.review_type} · {r.period_label}
                      {r.reviewer && ` · Evaluador: ${r.reviewer.full_name}`}
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
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st?.color ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {st?.label ?? r.status}
                    </span>
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        title="Completar evaluación"
                        onClick={() => setSubmitting(r)}
                        className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Completar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {submitting && <SubmitReviewModal review={submitting} onClose={() => setSubmitting(null)} />}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                Nueva evaluación de desempeño
              </h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pr-reviewee" className="text-xs font-medium text-gray-700">
                    Empleado a evaluar
                  </label>
                  <select
                    id="pr-reviewee"
                    value={revieweeId}
                    onChange={(e) => setRevieweeId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {(usersData?.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pr-type" className="text-xs font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    id="pr-type"
                    value={reviewType}
                    onChange={(e) => setReviewType(e.target.value as ReviewType)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {reviewType !== 'self' && (
                <div>
                  <label htmlFor="pr-reviewer" className="text-xs font-medium text-gray-700">
                    Evaluador
                  </label>
                  <select
                    id="pr-reviewer"
                    value={reviewerId}
                    onChange={(e) => setReviewerId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {(usersData?.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pr-period" className="text-xs font-medium text-gray-700">
                    Período
                  </label>
                  <input
                    id="pr-period"
                    type="text"
                    placeholder="Ej: Q2 2025"
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="pr-due" className="text-xs font-medium text-gray-700">
                    Fecha límite
                  </label>
                  <input
                    id="pr-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700">Preguntas ({questions.length})</p>
                <div className="mt-1 space-y-1.5">
                  {questions.map((q, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
                    >
                      <span className="flex-1 text-gray-700">
                        {i + 1}. {q.text}
                      </span>
                      <span className="text-gray-400">{q.type}</span>
                      <button
                        type="button"
                        title="Eliminar pregunta"
                        onClick={() => removeQuestion(i)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Nueva pregunta..."
                    value={newQText}
                    onChange={(e) => setNewQText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    title="Tipo de pregunta"
                    value={newQType}
                    onChange={(e) => setNewQType(e.target.value as QuestionType)}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="rating">Rating</option>
                    <option value="text">Texto</option>
                    <option value="choice">Opción</option>
                  </select>
                  <button
                    type="button"
                    title="Agregar pregunta"
                    onClick={addQuestion}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
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
                disabled={!revieweeId || !periodLabel || questions.length === 0 || create.isPending}
                onClick={() =>
                  create.mutate({
                    reviewee_id: revieweeId,
                    reviewer_id: reviewerId || revieweeId,
                    review_type: reviewType,
                    period_label: periodLabel,
                    due_date: dueDate || undefined,
                    questions,
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
    </div>
  )
}
