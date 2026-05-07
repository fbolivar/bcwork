'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { LogOut, Plus, X, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'En progreso', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700' },
}

const REASON_LABELS: Record<string, string> = {
  resignation: 'Renuncia voluntaria',
  termination: 'Terminación',
  retirement: 'Jubilación',
  contract_end: 'Fin de contrato',
  other: 'Otro',
}

const TASK_CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  equipment: 'Equipos',
  access: 'Accesos',
  documentation: 'Documentos',
  hr: 'RRHH',
  finance: 'Finanzas',
  farewell: 'Despedida',
}

export function OffboardingPanel() {
  const utils = trpc.useUtils()
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddTask, setShowAddTask] = useState<string | null>(null)
  const [showInterview, setShowInterview] = useState<string | null>(null)

  const [empId, setEmpId] = useState('')
  const [exitDate, setExitDate] = useState('')
  const [exitReason, setExitReason] = useState<string>('resignation')

  const [taskTitle, setTaskTitle] = useState('')
  const [taskCategory, setTaskCategory] = useState('general')
  const [taskDue, setTaskDue] = useState('')

  const [interviewNotes, setInterviewNotes] = useState('')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )
  const { data, isLoading } = trpc.manager.getOffboardingPlans.useQuery({
    status: filterStatus || undefined,
  })
  const plans = (data ?? []) as any[]

  const create = trpc.manager.createOffboardingPlan.useMutation({
    onSuccess: () => {
      utils.manager.getOffboardingPlans.invalidate()
      setShowCreate(false)
      setEmpId('')
      setExitDate('')
      setExitReason('resignation')
    },
  })
  const updatePlan = trpc.manager.updateOffboardingPlan.useMutation({
    onSuccess: () => utils.manager.getOffboardingPlans.invalidate(),
  })
  const toggleTask = trpc.manager.toggleOffboardingTask.useMutation({
    onSuccess: () => utils.manager.getOffboardingPlans.invalidate(),
  })
  const addTask = trpc.manager.addOffboardingTask.useMutation({
    onSuccess: () => {
      utils.manager.getOffboardingPlans.invalidate()
      setShowAddTask(null)
      setTaskTitle('')
      setTaskDue('')
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Offboarding</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Proceso de salida estructurado por empleado
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nuevo proceso
        </button>
      </div>

      <div className="flex gap-1.5">
        {(['', 'pending', 'in_progress', 'completed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {s === '' ? 'Todos' : (STATUS_CONFIG[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <LogOut className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay procesos de offboarding activos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((p: any) => {
            const cfg = STATUS_CONFIG[p.status as string] ?? {
              label: p.status,
              color: 'bg-gray-100 text-gray-500',
            }
            const expanded = expandedId === p.id
            const completed = (p.tasks as any[]).filter((t: any) => t.completed_at).length
            const total = (p.tasks as any[]).length
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                    {(p.full_name ?? p.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{p.full_name ?? p.email}</p>
                    <p className="text-xs text-gray-400">
                      {p.exit_reason ? REASON_LABELS[p.exit_reason] : 'Motivo no especificado'}
                      {p.exit_date &&
                        ` · Salida: ${new Date(p.exit_date).toLocaleDateString('es-CO')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{pct}%</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    {p.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() =>
                          updatePlan.mutate({
                            id: p.id,
                            status: p.status === 'pending' ? 'in_progress' : 'completed',
                          })
                        }
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600"
                      >
                        {p.status === 'pending' ? 'Iniciar' : 'Completar'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                      className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50"
                    >
                      {expanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {total > 0 && (
                  <div className="px-4 pb-2">
                    <div className="h-1 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-1 rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {expanded && (
                  <div className="space-y-3 border-t border-gray-50 px-4 py-3">
                    {/* Tasks */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                          Checklist ({completed}/{total})
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAddTask(p.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          + Tarea
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(p.tasks as any[]).map((t: any) => (
                          <div key={t.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                toggleTask.mutate({ id: t.id, completed: !t.completed_at })
                              }
                              className="shrink-0 text-gray-300 hover:text-blue-500"
                            >
                              {t.completed_at ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </button>
                            <p
                              className={`flex-1 text-xs ${t.completed_at ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                            >
                              {t.title}
                            </p>
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">
                              {TASK_CATEGORY_LABELS[t.category] ?? t.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Exit interview */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                          Entrevista de salida
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowInterview(p.id)
                            setInterviewNotes(p.exit_interview_notes ?? '')
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {p.exit_interview_notes ? 'Editar' : 'Agregar notas'}
                        </button>
                      </div>
                      {p.exit_interview_notes ? (
                        <p className="whitespace-pre-line text-xs text-gray-500">
                          {p.exit_interview_notes}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">Sin notas de entrevista de salida.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nuevo proceso de salida</h3>
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
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
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
                <label className="text-xs font-medium text-gray-700">Motivo de salida</label>
                <select
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  {Object.entries(REASON_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Fecha de salida</label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
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
                disabled={!empId || create.isPending}
                onClick={() =>
                  create.mutate({
                    employee_id: empId,
                    exit_date: exitDate || undefined,
                    exit_reason: exitReason as any,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear proceso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add task modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nueva tarea</h3>
              <button
                type="button"
                onClick={() => setShowAddTask(null)}
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
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Ej: Firmar carta de renuncia"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Categoría</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(TASK_CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Fecha límite</label>
                  <input
                    type="date"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddTask(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!taskTitle.trim() || addTask.isPending}
                onClick={() =>
                  addTask.mutate({
                    plan_id: showAddTask!,
                    title: taskTitle.trim(),
                    category: taskCategory as any,
                    due_date: taskDue || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview notes modal */}
      {showInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Entrevista de salida</h3>
              <button
                type="button"
                onClick={() => setShowInterview(null)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              rows={5}
              placeholder="Motivos, feedback, aprendizajes..."
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowInterview(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={updatePlan.isPending}
                onClick={() => {
                  updatePlan.mutate({ id: showInterview!, exit_interview_notes: interviewNotes })
                  setShowInterview(null)
                }}
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
