'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { BarChart2, Plus, X, ChevronRight, Send, EyeOff } from 'lucide-react'

const DEFAULT_QUESTIONS = [
  { id: 'q1', text: '¿Cómo te sientes esta semana?', type: 'rating' as const },
  {
    id: 'q2',
    text: '¿Tienes todo lo que necesitas para hacer tu trabajo?',
    type: 'yesno' as const,
  },
  { id: 'q3', text: '¿Hay algo que le impide al equipo avanzar?', type: 'text' as const },
]

export function PulseSurveysPanel() {
  const utils = trpc.useUtils()
  const [view, setView] = useState<'list' | 'create' | 'results'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'active' | 'closed'>('all')

  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS)
  const [endsAt, setEndsAt] = useState('')

  const { data: surveys, isLoading } = trpc.manager.getTeamPulseSurveys.useQuery({
    status: filterStatus,
  })
  const allSurveys = (surveys ?? []) as any[]

  const { data: results } = trpc.manager.getPulseSurveyResults.useQuery(
    { surveyId: selectedId! },
    { enabled: !!selectedId && view === 'results' },
  )

  const create = trpc.manager.createPulseSurvey.useMutation({
    onSuccess: () => {
      utils.manager.getTeamPulseSurveys.invalidate()
      setView('list')
      setTitle('')
      setQuestions(DEFAULT_QUESTIONS)
    },
  })

  const publish = trpc.manager.publishPulseSurvey.useMutation({
    onSuccess: () => utils.manager.getTeamPulseSurveys.invalidate(),
  })

  function addQuestion() {
    setQuestions([...questions, { id: `q${Date.now()}`, text: '', type: 'rating' as const }])
  }

  if (view === 'results' && selectedId && results) {
    const r = results as any
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setView('list')
              setSelectedId(null)
            }}
            className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{(r.survey as any)?.title}</h2>
            <p className="text-xs text-gray-400">{r.response_count} respuestas</p>
          </div>
        </div>
        <div className="space-y-4">
          {(r.questions as any[]).map((q: any) => (
            <div key={q.id} className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="mb-3 text-sm font-medium text-gray-800">{q.text}</p>
              {q.type === 'rating' && q.avg !== null && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-blue-600">{q.avg.toFixed(1)}</span>
                    <span className="text-sm text-gray-400">/ 5 ({q.count} respuestas)</span>
                  </div>
                  <div className="space-y-1">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const count = q.distribution[n] ?? 0
                      const pct = q.count > 0 ? (count / q.count) * 100 : 0
                      return (
                        <div key={n} className="flex items-center gap-2 text-xs">
                          <span className="w-4 text-gray-500">{n}</span>
                          <div className="h-2 flex-1 rounded-full bg-gray-100">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-gray-400">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {q.type === 'yesno' && (
                <div className="flex gap-4">
                  <span className="text-sm text-green-600">
                    Sí: {(q.answers as string[]).filter((a) => a === 'yes').length}
                  </span>
                  <span className="text-sm text-red-500">
                    No: {(q.answers as string[]).filter((a) => a === 'no').length}
                  </span>
                </div>
              )}
              {q.type === 'text' && (
                <div className="space-y-1.5">
                  {(q.answers as string[]).map((a, i) => (
                    <p key={i} className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
                      {a}
                    </p>
                  ))}
                  {q.answers.length === 0 && (
                    <p className="text-xs text-gray-400">Sin respuestas de texto aún</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'create') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setView('list')}
            className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">Nueva encuesta de pulso</h2>
        </div>
        <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5">
          <div>
            <label className="text-xs font-medium text-gray-700">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Pulso semanal — mayo 2026"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Cierre (opcional)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Preguntas</label>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <Plus className="h-3 w-3" /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="flex gap-2">
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => {
                      const updated = [...questions]
                      updated[i] = { ...q, text: e.target.value }
                      setQuestions(updated)
                    }}
                    placeholder={`Pregunta ${i + 1}...`}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none"
                  />
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const updated = [...questions]
                      updated[i] = { ...q, type: e.target.value as 'rating' | 'text' | 'yesno' }
                      setQuestions(updated)
                    }}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="rating">Calificación</option>
                    <option value="yesno">Sí/No</option>
                    <option value="text">Texto libre</option>
                  </select>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setView('list')}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!title.trim() || questions.every((q) => !q.text.trim()) || create.isPending}
              onClick={() =>
                create.mutate({
                  title,
                  questions: questions.filter((q) => q.text.trim()),
                  ends_at: endsAt || undefined,
                })
              }
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Crear encuesta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Encuestas de pulso</h2>
          <p className="mt-0.5 text-sm text-gray-500">Mide el bienestar y engagement del equipo</p>
        </div>
        <button
          type="button"
          onClick={() => setView('create')}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nueva encuesta
        </button>
      </div>

      <div className="flex gap-1.5">
        {(['all', 'active', 'draft', 'closed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {{ all: 'Todas', active: 'Activas', draft: 'Borrador', closed: 'Cerradas' }[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allSurveys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <BarChart2 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay encuestas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allSurveys.map((s: any) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-400">
                  {(s.questions as any[]).length} preguntas · {s.response_count} respuestas
                  {s.ends_at &&
                    ` · Cierra ${new Date(s.ends_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  s.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : s.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {{ active: 'Activa', draft: 'Borrador', closed: 'Cerrada' }[s.status as string] ??
                  s.status}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                {s.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => publish.mutate({ id: s.id, status: 'active' })}
                    title="Publicar"
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-green-300 hover:text-green-600"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
                {s.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => publish.mutate({ id: s.id, status: 'closed' })}
                    title="Cerrar encuesta"
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-red-300 hover:text-red-500"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(s.id)
                    setView('results')
                  }}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
