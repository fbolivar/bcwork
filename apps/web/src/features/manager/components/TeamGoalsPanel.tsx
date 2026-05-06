'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Target, Plus, X, CheckCircle2 } from 'lucide-react'

export function TeamGoalsPanel() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterStatus, setFilterStatus] = useState<'active' | 'completed' | 'cancelled' | 'all'>(
    'active',
  )

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [unit, setUnit] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  const { data: goals, isLoading } = trpc.manager.getTeamGoals.useQuery({
    status: filterStatus,
    employee_id: filterEmployee || undefined,
  })
  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )

  const create = trpc.manager.createTeamGoal.useMutation({
    onSuccess: () => {
      utils.manager.getTeamGoals.invalidate()
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setTargetValue('')
      setUnit('')
      setDueDate('')
      setEmployeeId('')
    },
  })

  const update = trpc.manager.updateTeamGoal.useMutation({
    onSuccess: () => utils.manager.getTeamGoals.invalidate(),
  })

  const allGoals = (goals ?? []) as any[]

  function progressPct(goal: any) {
    if (!goal.target_value || goal.target_value === 0) return 0
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Objetivos del equipo</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Crea y da seguimiento a los objetivos de tus reportes
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nuevo objetivo
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todos los empleados</option>
          {(members ?? []).map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.full_name ?? m.email}
            </option>
          ))}
        </select>
        {(['active', 'completed', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s === 'all' ? 'all' : s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {{ active: 'Activos', completed: 'Completados', all: 'Todos' }[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allGoals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Target className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay objetivos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allGoals.map((goal: any) => {
            const pct = progressPct(goal)
            return (
              <div key={goal.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-start gap-3">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">{goal.title}</p>
                      {goal.status === 'completed' && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          Completado
                        </span>
                      )}
                      {goal.status === 'cancelled' && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                          Cancelado
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {goal.user_name ?? goal.user_email}
                      {goal.due_date &&
                        ` · Vence ${new Date(goal.due_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </p>
                    {goal.description && (
                      <p className="mt-1 text-xs text-gray-500">{goal.description}</p>
                    )}
                    {goal.target_value != null && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            {goal.current_value} / {goal.target_value} {goal.unit ?? ''}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className={`h-1.5 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {goal.status === 'active' && (
                    <button
                      type="button"
                      title="Marcar completado"
                      onClick={() => update.mutate({ id: goal.id, status: 'completed' })}
                      disabled={update.isPending}
                      className="shrink-0 rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-green-300 hover:text-green-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nuevo objetivo</h3>
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
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
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
                <label className="text-xs font-medium text-gray-700">Título del objetivo</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Aumentar ventas Q2"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Descripción (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Valor objetivo</label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="100"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Unidad</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="ventas, %..."
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
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
                disabled={!title.trim() || !employeeId || create.isPending}
                onClick={() =>
                  create.mutate({
                    employee_id: employeeId,
                    title,
                    description: description || undefined,
                    target_value: targetValue ? Number(targetValue) : undefined,
                    unit: unit || undefined,
                    due_date: dueDate || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear objetivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
