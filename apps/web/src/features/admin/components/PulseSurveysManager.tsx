'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, X, ChevronDown, ChevronUp, Play, Square, BarChart2, Trash2 } from 'lucide-react'

type QType = 'rating' | 'text' | 'choice'
type Question = { text: string; type: QType; options: string[] }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  active: { label: 'Activa', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Cerrada', color: 'bg-red-100 text-red-600' },
}

function emptyQuestion(): Question {
  return { text: '', type: 'rating', options: [] }
}

export function PulseSurveysManager() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()])
  const [endsAt, setEndsAt] = useState('')
  const [activateNow, setActivateNow] = useState(true)

  const { data: surveys, isLoading } = trpc.admin.listPulseSurveys.useQuery()
  const { data: results } = trpc.admin.getPulseSurveyResults.useQuery(
    { survey_id: expandedId! },
    { enabled: !!expandedId },
  )

  const create = trpc.admin.createPulseSurvey.useMutation({
    onSuccess: () => {
      utils.admin.listPulseSurveys.invalidate()
      setShowCreate(false)
      setTitle('')
      setQuestions([emptyQuestion()])
      setEndsAt('')
    },
  })

  const updateStatus = trpc.admin.updatePulseSurveyStatus.useMutation({
    onSuccess: () => utils.admin.listPulseSurveys.invalidate(),
  })

  function updateQuestion(idx: number, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()])
  }

  function removeQuestion(idx: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Encuestas de pulso</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Mide el clima del equipo con encuestas rápidas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva encuesta
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (surveys ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <BarChart2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay encuestas creadas todavía</p>
        </div>
      ) : (
        <div className="space-y-3">
          {((surveys ?? []) as any[]).map((raw) => {
            type SurveyRow = {
              id: string
              title: string
              status: string
              questions: unknown
              created_at: string
            }
            const s = raw as SurveyRow
            const st = STATUS_LABELS[s.status] ?? STATUS_LABELS.draft!
            const isExpanded = expandedId === s.id
            return (
              <div key={s.id} className="rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{s.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {(s.questions as Question[])?.length ?? 0} preguntas ·{' '}
                      {new Date(s.created_at).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
                    {st.label}
                  </span>

                  {s.status === 'draft' && (
                    <button
                      type="button"
                      title="Activar"
                      onClick={() => updateStatus.mutate({ id: s.id, status: 'active' })}
                      className="rounded-lg border border-green-200 p-1.5 text-green-600 hover:bg-green-50"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {s.status === 'active' && (
                    <button
                      type="button"
                      title="Cerrar"
                      onClick={() => updateStatus.mutate({ id: s.id, status: 'closed' })}
                      className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Square className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {isExpanded && results && (
                  <div className="border-t border-gray-100 px-4 py-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Resultados — {results.responses.length} respuesta
                      {results.responses.length !== 1 ? 's' : ''}
                    </p>
                    {results.responses.length === 0 ? (
                      <p className="text-sm text-gray-400">Sin respuestas aún</p>
                    ) : (
                      (() => {
                        const qs = (results.survey as any).questions as Question[]
                        const resps = results.responses as any[]
                        return qs.map((q, qi) => {
                          type RespRow = { answers: { question_index: number; value: unknown }[] }
                          const answersForQ = resps.map((rraw) => {
                            const r = rraw as RespRow
                            return r.answers.find((a) => a.question_index === qi)?.value
                          })

                          if (q.type === 'rating') {
                            const nums = answersForQ.filter(
                              (v) => typeof v === 'number',
                            ) as number[]
                            const avg =
                              nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
                            const dist = [1, 2, 3, 4, 5].map((n) => ({
                              n,
                              count: nums.filter((v) => v === n).length,
                            }))
                            return (
                              <div key={qi} className="mb-4">
                                <p className="text-sm font-medium text-gray-700">
                                  {qi + 1}. {q.text}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  Promedio:{' '}
                                  <span className="font-semibold text-blue-600">
                                    {avg.toFixed(1)}/5
                                  </span>
                                </p>
                                <div className="mt-2 flex gap-1.5">
                                  {dist.map(({ n, count }) => (
                                    <div key={n} className="flex flex-col items-center gap-0.5">
                                      <div
                                        className="w-7 rounded-sm bg-blue-400"
                                        style={{
                                          height: `${Math.max(4, (count / nums.length) * 48)}px`,
                                        }}
                                      />
                                      <span className="text-xs text-gray-500">{n}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          }

                          if (q.type === 'text') {
                            const texts = answersForQ.filter(
                              (v) => typeof v === 'string' && v,
                            ) as string[]
                            return (
                              <div key={qi} className="mb-4">
                                <p className="text-sm font-medium text-gray-700">
                                  {qi + 1}. {q.text}
                                </p>
                                <div className="mt-2 space-y-1.5">
                                  {texts.map((t, ti) => (
                                    <div
                                      key={ti}
                                      className="rounded-lg bg-gray-50 px-3 py-2 text-sm italic text-gray-600"
                                    >
                                      "{t}"
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          }

                          if (q.type === 'choice') {
                            const chosen = answersForQ.filter(
                              (v) => typeof v === 'string',
                            ) as string[]
                            const total = chosen.length
                            return (
                              <div key={qi} className="mb-4">
                                <p className="text-sm font-medium text-gray-700">
                                  {qi + 1}. {q.text}
                                </p>
                                <div className="mt-2 space-y-1.5">
                                  {(q.options ?? []).map((opt) => {
                                    const count = chosen.filter((v) => v === opt).length
                                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                                    return (
                                      <div key={opt} className="flex items-center gap-2">
                                        <span className="w-32 truncate text-xs text-gray-600">
                                          {opt}
                                        </span>
                                        <div className="h-2 flex-1 rounded-full bg-gray-100">
                                          <div
                                            className="h-2 rounded-full bg-blue-400"
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                        <span className="w-10 text-right text-xs text-gray-500">
                                          {pct}%
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          }

                          return null
                        })
                      })()
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nueva encuesta</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700">Título de la encuesta</label>
                <input
                  type="text"
                  placeholder="Ej: ¿Cómo te sientes esta semana?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-700">Preguntas</label>
                  <button
                    type="button"
                    onClick={addQuestion}
                    disabled={questions.length >= 10}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                  >
                    + Agregar pregunta
                  </button>
                </div>
                <div className="mt-2 space-y-3">
                  {questions.map((q, i) => (
                    <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Pregunta ${i + 1}`}
                          value={q.text}
                          onChange={(e) => updateQuestion(i, { text: e.target.value })}
                          className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <select
                          title="Tipo de pregunta"
                          value={q.type}
                          onChange={(e) =>
                            updateQuestion(i, { type: e.target.value as QType, options: [] })
                          }
                          className="rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none"
                        >
                          <option value="rating">Calificación (1-5)</option>
                          <option value="text">Texto libre</option>
                          <option value="choice">Opción múltiple</option>
                        </select>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            title="Eliminar pregunta"
                            onClick={() => removeQuestion(i)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {q.type === 'choice' && (
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="Opciones separadas por coma (ej: Sí, No, A veces)"
                            value={q.options.join(', ')}
                            onChange={(e) =>
                              updateQuestion(i, {
                                options: e.target.value
                                  .split(',')
                                  .map((o) => o.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="survey-ends-at" className="text-xs font-medium text-gray-700">
                  Fecha de cierre (opcional)
                </label>
                <input
                  id="survey-ends-at"
                  type="date"
                  title="Fecha de cierre"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={activateNow}
                  onChange={(e) => setActivateNow(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Activar inmediatamente
              </label>
            </div>

            <div className="mt-5 flex gap-2">
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
                  !title.trim() || questions.some((q) => !q.text.trim()) || create.isPending
                }
                onClick={() =>
                  create.mutate({
                    title,
                    questions: questions.map((q) => ({
                      text: q.text,
                      type: q.type,
                      options: q.options,
                    })),
                    ends_at: endsAt || undefined,
                    activate: activateNow,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear encuesta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
