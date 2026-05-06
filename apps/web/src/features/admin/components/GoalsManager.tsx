'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, X, Target, ChevronDown } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completado', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500' },
}

function CreateGoalModal({
  employees,
  onClose,
  onSaved,
}: {
  employees: { id: string; full_name: string | null }[]
  onClose: () => void
  onSaved: () => void
}) {
  const utils = trpc.useUtils()
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [unit, setUnit] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')

  const create = trpc.admin.createGoal.useMutation({
    onSuccess: () => {
      void utils.admin.listGoals.invalidate()
      onSaved()
    },
    onError: (e) => setError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!employeeId) {
      setError('Selecciona un empleado')
      return
    }
    if (!title.trim()) {
      setError('El título es requerido')
      return
    }
    create.mutate({
      employee_id: employeeId,
      title: title.trim(),
      description: description.trim() || undefined,
      target_value: targetValue ? parseFloat(targetValue) : undefined,
      unit: unit.trim() || undefined,
      due_date: dueDate || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Asignar objetivo</h3>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700">Empleado</label>
            <div className="relative mt-1">
              <select
                id="goal-employee"
                title="Seleccionar empleado"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name ?? emp.id}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label htmlFor="goal-title" className="text-xs font-medium text-gray-700">
              Título del objetivo
            </label>
            <input
              id="goal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Ej: Completar 5 proyectos este mes"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="goal-description" className="text-xs font-medium text-gray-700">
              Descripción (opcional)
            </label>
            <textarea
              id="goal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Descripción del objetivo"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Meta (valor numérico)</label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                step="any"
                min={0}
                placeholder="Ej: 100"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Unidad</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={50}
                placeholder="Ej: tareas, horas, %"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Fecha límite (opcional)</label>
            <input
              type="date"
              value={dueDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {create.isPending ? 'Guardando…' : 'Asignar objetivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function GoalsManager() {
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'cancelled' | 'all'>(
    'active',
  )

  const { data: goals, isLoading } = trpc.admin.listGoals.useQuery({ status: statusFilter })
  const { data: employeesResult } = trpc.admin.listUsers.useQuery({ pageSize: 100 })
  const utils = trpc.useUtils()

  const updateGoal = trpc.admin.updateGoal.useMutation({
    onSuccess: () => {
      void utils.admin.listGoals.invalidate()
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Objetivos y KPIs</h1>
          <p className="mt-0.5 text-sm text-gray-500">Asigna y gestiona metas para tus empleados</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Asignar objetivo
        </button>
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {(['active', 'completed', 'cancelled', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {
              {
                active: 'Activos',
                completed: 'Completados',
                cancelled: 'Cancelados',
                all: 'Todos',
              }[s]
            }
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="space-y-3">
          {goals.map((g) => {
            const emp = g.users as { full_name: string | null; department: string | null } | null
            const cfg = STATUS_CONFIG[g.status] ?? STATUS_CONFIG['active']!
            const pct =
              g.target_value != null && Number(g.target_value) > 0
                ? Math.min(
                    100,
                    Math.round((Number(g.current_value ?? 0) / Number(g.target_value)) * 100),
                  )
                : null

            return (
              <div key={g.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-500">
                        {emp?.full_name ?? 'Empleado'}
                      </p>
                      {emp?.department && (
                        <span className="text-xs text-gray-400">{emp.department}</span>
                      )}
                    </div>
                    <p className="mt-0.5 font-semibold text-gray-900">{g.title}</p>
                    {g.description && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{g.description}</p>
                    )}
                    {g.target_value != null && (
                      <div className="mt-2">
                        <div className="mb-1 flex justify-between text-xs text-gray-500">
                          <span>Progreso</span>
                          <span className="font-medium tabular-nums">
                            {g.current_value ?? 0} / {g.target_value} {g.unit ?? ''}{' '}
                            {pct != null ? `(${pct}%)` : ''}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${pct ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {g.due_date && (
                      <p className="mt-1 text-xs text-gray-400">
                        Vence: {new Date(g.due_date).toLocaleDateString('es-CO')}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls}`}
                    >
                      {cfg.label}
                    </span>
                    {g.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => updateGoal.mutate({ id: g.id, status: 'cancelled' })}
                        className="text-xs text-red-400 hover:text-red-600 hover:underline"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Target className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Sin objetivos</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-3 text-sm font-medium text-blue-600 hover:underline"
          >
            Asignar primer objetivo
          </button>
        </div>
      )}

      {showCreate && employeesResult && (
        <CreateGoalModal
          employees={employeesResult.data.filter(
            (e: { status: string | null }) => e.status === 'active',
          )}
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
