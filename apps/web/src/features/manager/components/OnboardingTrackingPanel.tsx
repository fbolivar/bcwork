'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { UserCheck, CheckCircle2, Circle, Plus, X, Clock } from 'lucide-react'

const TASK_CATEGORIES = [
  'general',
  'documentation',
  'training',
  'equipment',
  'access',
  'introduction',
]
const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  documentation: 'Documentos',
  training: 'Capacitación',
  equipment: 'Equipos',
  access: 'Accesos',
  introduction: 'Presentaciones',
}

function daysAgo(dateStr: string) {
  const d = new Date(dateStr)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  return diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : `Hace ${diff} días`
}

export function OnboardingTrackingPanel() {
  const utils = trpc.useUtils()
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskCategory, setTaskCategory] = useState('general')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskDesc, setTaskDesc] = useState('')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id

  const { data, isLoading } = trpc.manager.getOnboardingProgress.useQuery({ teamId })
  const newHires = (data?.new_hires ?? []) as any[]
  const allEmployees = (data?.employees ?? []) as any[]
  const tasks = (data?.tasks ?? []) as any[]

  const createTask = trpc.manager.createOnboardingTask.useMutation({
    onSuccess: () => {
      utils.manager.getOnboardingProgress.invalidate()
      setShowAdd(false)
      resetForm()
    },
  })
  const toggleTask = trpc.manager.toggleOnboardingTask.useMutation({
    onSuccess: () => utils.manager.getOnboardingProgress.invalidate(),
  })

  function resetForm() {
    setTaskTitle('')
    setTaskCategory('general')
    setTaskDueDate('')
    setTaskDesc('')
  }

  const displayEmployees = newHires.length > 0 ? newHires : allEmployees.slice(0, 10)
  const selected = selectedEmployee ?? displayEmployees[0]?.id
  const selectedEmp = displayEmployees.find((e) => e.id === selected)
  const empTasks = tasks
    .filter((t: any) => t.employee_id === selected)
    .sort((a: any, b: any) => a.order_index - b.order_index)
  const completedCount = empTasks.filter((t: any) => t.completed_at).length
  const pct = empTasks.length > 0 ? Math.round((completedCount / empTasks.length) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Onboarding</h2>
          <p className="mt-0.5 text-sm text-gray-500">Seguimiento de nuevas incorporaciones</p>
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Nueva tarea
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : displayEmployees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <UserCheck className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay empleados recientes</p>
          <p className="mt-1 text-xs text-gray-400">
            Agrega fechas de ingreso a los empleados para ver el onboarding
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Employee list */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Empleados
            </p>
            {displayEmployees.map((e: any) => {
              const eTasks = tasks.filter((t: any) => t.employee_id === e.id)
              const eCompleted = eTasks.filter((t: any) => t.completed_at).length
              const ePct = eTasks.length > 0 ? Math.round((eCompleted / eTasks.length) * 100) : 0
              const isSelected = (selected ?? displayEmployees[0]?.id) === e.id
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedEmployee(e.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {(e.full_name ?? e.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {e.full_name ?? e.email}
                      </p>
                      {e.hire_date && (
                        <p className="text-[10px] text-gray-400">Ingresó: {daysAgo(e.hire_date)}</p>
                      )}
                    </div>
                  </div>
                  {eTasks.length > 0 && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full ${ePct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${ePct}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {eCompleted}/{eTasks.length} tareas
                      </p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tasks */}
          <div className="lg:col-span-2">
            {selectedEmp && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">
                    {selectedEmp.full_name ?? selectedEmp.email}
                  </p>
                  <span
                    className={`text-xs font-medium ${pct === 100 ? 'text-green-600' : 'text-blue-600'}`}
                  >
                    {pct}% completado
                  </span>
                </div>
                {empTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center">
                    <p className="text-sm text-gray-400">Sin tareas. Agrega la primera.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {empTasks.map((t: any) => (
                      <div
                        key={t.id}
                        className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleTask.mutate({ id: t.id, completed: !t.completed_at })
                          }
                          className="mt-0.5 shrink-0 text-gray-300 hover:text-blue-500"
                        >
                          {t.completed_at ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p
                            className={`text-sm ${t.completed_at ? 'text-gray-400 line-through' : 'text-gray-800'}`}
                          >
                            {t.title}
                          </p>
                          {t.description && (
                            <p className="text-xs text-gray-400">{t.description}</p>
                          )}
                          <div className="mt-1 flex gap-2">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                              {CATEGORY_LABELS[t.category] ?? t.category}
                            </span>
                            {t.due_date && (
                              <span
                                className={`flex items-center gap-0.5 text-[10px] ${new Date(t.due_date) < new Date() && !t.completed_at ? 'text-red-500' : 'text-gray-400'}`}
                              >
                                <Clock className="h-2.5 w-2.5" />{' '}
                                {new Date(t.due_date).toLocaleDateString('es-CO', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showAdd && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nueva tarea de onboarding</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false)
                  resetForm()
                }}
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
                  placeholder="Ej: Firmar contrato laboral"
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
                    {TASK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Fecha límite</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Descripción (opcional)</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false)
                  resetForm()
                }}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!taskTitle.trim() || createTask.isPending}
                onClick={() =>
                  createTask.mutate({
                    employee_id: selected!,
                    title: taskTitle.trim(),
                    category: taskCategory,
                    due_date: taskDueDate || undefined,
                    description: taskDesc || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
