'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Smile, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

const SCORE_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'Detractor', color: 'text-red-500' },
  1: { label: 'Detractor', color: 'text-red-500' },
  2: { label: 'Detractor', color: 'text-red-500' },
  3: { label: 'Detractor', color: 'text-red-500' },
  4: { label: 'Detractor', color: 'text-red-500' },
  5: { label: 'Detractor', color: 'text-red-500' },
  6: { label: 'Detractor', color: 'text-red-500' },
  7: { label: 'Pasivo', color: 'text-yellow-500' },
  8: { label: 'Pasivo', color: 'text-yellow-500' },
  9: { label: 'Promotor', color: 'text-green-500' },
  10: { label: 'Promotor', color: 'text-green-500' },
}

function scoreColor(enps: number | null) {
  if (enps === null) return 'text-gray-400'
  if (enps >= 50) return 'text-green-600'
  if (enps >= 10) return 'text-yellow-600'
  return 'text-red-600'
}

export function EnpsPanel() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showRespond, setShowRespond] = useState<string | null>(null)

  const [surveyTitle, setSurveyTitle] = useState('Encuesta eNPS')
  const [surveyPeriod, setSurveyPeriod] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`
  })
  const [respondEmployee, setRespondEmployee] = useState('')
  const [respondScore, setRespondScore] = useState(8)
  const [respondComment, setRespondComment] = useState('')

  const { data: surveys, isLoading } = trpc.manager.getEnpsSurveys.useQuery()
  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )
  const { data: responses } = trpc.manager.getEnpsSurveyResponses.useQuery(
    { survey_id: expandedId! },
    { enabled: !!expandedId },
  )

  const create = trpc.manager.createEnpsSurvey.useMutation({
    onSuccess: () => {
      utils.manager.getEnpsSurveys.invalidate()
      setShowCreate(false)
      setSurveyTitle('Encuesta eNPS')
    },
  })
  const submit = trpc.manager.submitEnpsResponse.useMutation({
    onSuccess: () => {
      utils.manager.getEnpsSurveys.invalidate()
      utils.manager.getEnpsSurveyResponses.invalidate()
      setShowRespond(null)
      setRespondEmployee('')
      setRespondScore(8)
      setRespondComment('')
    },
  })

  const surveyList = (surveys ?? []) as any[]
  const latest = surveyList[0]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            eNPS — Employee Net Promoter Score
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">¿Tu equipo recomendaría trabajar aquí?</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nueva encuesta
        </button>
      </div>

      {/* Latest score hero */}
      {latest && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                Score actual · {latest.period}
              </p>
              <p className={`mt-1 text-5xl font-bold ${scoreColor(latest.enps_score)}`}>
                {latest.enps_score !== null ? latest.enps_score : '—'}
              </p>
              <p className="mt-1 text-xs text-gray-400">{latest.total_responses} respuestas</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-green-50 px-4 py-3">
                <p className="text-[10px] uppercase text-green-500">Promotores</p>
                <p className="mt-1 text-xl font-bold text-green-600">{latest.promoters}</p>
                <p className="text-[10px] text-gray-400">9–10</p>
              </div>
              <div className="rounded-xl bg-yellow-50 px-4 py-3">
                <p className="text-[10px] uppercase text-yellow-500">Pasivos</p>
                <p className="mt-1 text-xl font-bold text-yellow-600">
                  {latest.total_responses - latest.promoters - latest.detractors}
                </p>
                <p className="text-[10px] text-gray-400">7–8</p>
              </div>
              <div className="rounded-xl bg-red-50 px-4 py-3">
                <p className="text-[10px] uppercase text-red-400">Detractores</p>
                <p className="mt-1 text-xl font-bold text-red-600">{latest.detractors}</p>
                <p className="text-[10px] text-gray-400">0–6</p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            {latest.total_responses > 0 && (
              <div className="flex h-full">
                <div
                  className="h-full bg-green-400"
                  style={{ width: `${(latest.promoters / latest.total_responses) * 100}%` }}
                />
                <div
                  className="h-full bg-yellow-300"
                  style={{
                    width: `${((latest.total_responses - latest.promoters - latest.detractors) / latest.total_responses) * 100}%`,
                  }}
                />
                <div
                  className="h-full bg-red-400"
                  style={{ width: `${(latest.detractors / latest.total_responses) * 100}%` }}
                />
              </div>
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400">
            eNPS = %Promotores − %Detractores · Excelente ≥50 · Bueno ≥10 · Negativo &lt;0
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : surveyList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Smile className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay encuestas eNPS aún</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Historial</p>
          {surveyList.map((s: any) => {
            const isOpen = expandedId === s.id
            return (
              <div
                key={s.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{s.title}</p>
                    <p className="text-xs text-gray-400">
                      {s.period} · {s.total_responses} respuestas
                    </p>
                  </div>
                  <span className={`text-lg font-bold ${scoreColor(s.enps_score)}`}>
                    {s.enps_score !== null ? s.enps_score : '—'}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRespond(s.id)
                        setRespondEmployee('')
                        setRespondScore(8)
                        setRespondComment('')
                      }}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600"
                    >
                      Registrar respuesta
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : s.id)}
                      className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50"
                    >
                      {isOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-gray-50 px-4 py-3">
                    {!responses || responses.length === 0 ? (
                      <p className="text-sm text-gray-400">Sin respuestas registradas.</p>
                    ) : (
                      <div className="space-y-2">
                        {(responses as any[]).map((r: any) => {
                          const sl = SCORE_LABEL[r.score as number] ?? {
                            label: '—',
                            color: 'text-gray-400',
                          }
                          return (
                            <div key={r.id} className="flex items-start gap-3">
                              <span
                                className={`text-sm font-bold ${sl.color} w-6 shrink-0 text-center`}
                              >
                                {r.score}
                              </span>
                              <div className="flex-1">
                                <span className={`text-[10px] font-medium ${sl.color}`}>
                                  {sl.label}
                                </span>
                                {r.comment && (
                                  <p className="mt-0.5 text-xs text-gray-500">{r.comment}</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create survey modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nueva encuesta eNPS</h3>
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
                <label className="text-xs font-medium text-gray-700">Título</label>
                <input
                  type="text"
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Período</label>
                <input
                  type="text"
                  value={surveyPeriod}
                  onChange={(e) => setSurveyPeriod(e.target.value)}
                  placeholder="Ej: 2026-Q2"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                disabled={!surveyTitle.trim() || !surveyPeriod.trim() || create.isPending}
                onClick={() => create.mutate({ title: surveyTitle, period: surveyPeriod })}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Respond modal */}
      {showRespond && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Registrar respuesta</h3>
              <button
                type="button"
                onClick={() => setShowRespond(null)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Empleado</label>
                <select
                  value={respondEmployee}
                  onChange={(e) => setRespondEmployee(e.target.value)}
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
                <label className="text-xs font-medium text-gray-700">
                  Puntuación:{' '}
                  <span className={`font-bold ${SCORE_LABEL[respondScore]?.color}`}>
                    {respondScore} — {SCORE_LABEL[respondScore]?.label}
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={respondScore}
                  onChange={(e) => setRespondScore(Number(e.target.value))}
                  className="mt-1 w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Comentario (opcional)</label>
                <textarea
                  value={respondComment}
                  onChange={(e) => setRespondComment(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowRespond(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!respondEmployee || submit.isPending}
                onClick={() =>
                  submit.mutate({
                    survey_id: showRespond!,
                    employee_id: respondEmployee,
                    score: respondScore,
                    comment: respondComment || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
