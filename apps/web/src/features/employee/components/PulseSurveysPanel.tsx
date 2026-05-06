'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { ClipboardList, CheckCircle, ChevronRight, X } from 'lucide-react'

type Question = { text: string; type: 'rating' | 'text' | 'choice'; options?: string[] }
type Answer = { question_index: number; value: unknown }

function SurveyModal({
  survey,
  onClose,
  onSubmit,
}: {
  survey: { id: string; title: string; questions: unknown }
  onClose: () => void
  onSubmit: (answers: Answer[]) => void
}) {
  const questions = (survey.questions as Question[]) ?? []
  const [answers, setAnswers] = useState<Record<number, unknown>>({})

  function setAnswer(idx: number, val: unknown) {
    setAnswers((prev) => ({ ...prev, [idx]: val }))
  }

  const allAnswered = questions.every((_, i) => answers[i] !== undefined && answers[i] !== '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-semibold text-gray-900">{survey.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
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
                  <span className="ml-1 self-center text-xs text-gray-400">
                    1 = Muy malo · 5 = Excelente
                  </span>
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
            disabled={!allAnswered}
            onClick={() =>
              onSubmit(
                Object.entries(answers).map(([idx, val]) => ({
                  question_index: Number(idx),
                  value: val,
                })),
              )
            }
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Enviar respuestas
          </button>
        </div>
      </div>
    </div>
  )
}

export function PulseSurveysPanel() {
  const utils = trpc.useUtils()
  const [activeSurvey, setActiveSurvey] = useState<null | {
    id: string
    title: string
    questions: unknown
  }>(null)

  const { data: surveys, isLoading } = trpc.employee.getActiveSurveys.useQuery()

  const submit = trpc.employee.submitSurveyResponse.useMutation({
    onSuccess: () => {
      utils.employee.getActiveSurveys.invalidate()
      setActiveSurvey(null)
    },
  })

  const pending = (surveys ?? []).filter((s) => !s.already_responded)
  const done = (surveys ?? []).filter((s) => s.already_responded)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Encuestas de pulso</h1>
        <p className="mt-0.5 text-sm text-gray-500">Comparte cómo te sientes con tu equipo</p>
      </div>

      {!isLoading && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
            <p className="text-xs text-orange-600">Pendientes</p>
            <p className="mt-0.5 text-2xl font-bold text-orange-700">{pending.length}</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
            <p className="text-xs text-green-600">Respondidas</p>
            <p className="mt-0.5 text-2xl font-bold text-green-700">{done.length}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (surveys ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No hay encuestas activas</p>
          <p className="mt-1 text-xs text-gray-400">Tu manager enviará encuestas ocasionalmente</p>
        </div>
      ) : (
        <div className="space-y-5">
          {pending.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Pendientes de responder
              </p>
              <div className="space-y-2">
                {pending.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSurvey(s)}
                    className="flex w-full items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 px-4 py-4 text-left transition-colors hover:bg-orange-100"
                  >
                    <ClipboardList className="h-5 w-5 shrink-0 text-orange-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{s.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {(s.questions as Question[])?.length ?? 0} preguntas
                        {s.ends_at &&
                          ` · Cierra ${new Date(s.ends_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-orange-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Ya respondidas
              </p>
              <div className="space-y-2">
                {done.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-4"
                  >
                    <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-700">{s.title}</p>
                      <p className="mt-0.5 text-xs text-gray-400">Respuesta enviada</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSurvey && (
        <SurveyModal
          survey={activeSurvey}
          onClose={() => setActiveSurvey(null)}
          onSubmit={(answers) => submit.mutate({ survey_id: activeSurvey.id, answers })}
        />
      )}
    </div>
  )
}
