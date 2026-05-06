'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Target, CheckCircle2, XCircle, TrendingUp, Edit3, X } from 'lucide-react'

const STATUS_CONFIG = {
  active: { label: 'Activo', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completado', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500' },
}

function ProgressModal({
  goal,
  onClose,
}: {
  goal: {
    id: string
    title: string
    current_value: number | null
    target_value: number | null
    unit: string | null
  }
  onClose: () => void
}) {
  const utils = trpc.useUtils()
  const [value, setValue] = useState(String(goal.current_value ?? 0))
  const [error, setError] = useState('')

  const update = trpc.employee.updateGoalProgress.useMutation({
    onSuccess: () => {
      void utils.employee.getMyGoals.invalidate()
      onClose()
    },
    onError: (e) => setError(e.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Actualizar progreso</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">{goal.title}</p>

        <div className="mt-4">
          <label className="text-xs font-medium text-gray-700">
            Valor actual {goal.unit ? `(${goal.unit})` : ''}
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              value={value}
              min={0}
              max={goal.target_value ?? undefined}
              step="any"
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {goal.unit && <span className="text-sm text-gray-500">{goal.unit}</span>}
          </div>
          {goal.target_value != null && (
            <p className="mt-1 text-xs text-gray-400">
              Meta: {goal.target_value} {goal.unit ?? ''}
            </p>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

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
            disabled={update.isPending}
            onClick={() => {
              const num = parseFloat(value)
              if (isNaN(num)) {
                setError('Ingresa un número válido')
                return
              }
              update.mutate({ id: goal.id, current_value: num })
            }}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GoalCard({
  goal,
}: {
  goal: {
    id: string
    title: string
    description: string | null
    target_value: number | null
    current_value: number | null
    unit: string | null
    due_date: string | null
    status: string
    created_at: string
  }
}) {
  const [editing, setEditing] = useState(false)
  const pct =
    goal.target_value != null && goal.target_value > 0
      ? Math.min(100, Math.round(((goal.current_value ?? 0) / goal.target_value) * 100))
      : null
  const cfg = STATUS_CONFIG[goal.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active
  const isActive = goal.status === 'active'

  const progressColor =
    pct == null
      ? 'bg-blue-500'
      : pct >= 100
        ? 'bg-green-500'
        : pct >= 60
          ? 'bg-blue-500'
          : pct >= 30
            ? 'bg-yellow-500'
            : 'bg-red-400'

  return (
    <>
      <div
        className={`rounded-xl border p-4 ${isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
                {cfg.label}
              </span>
              {goal.due_date && (
                <span className="text-[11px] text-gray-400">
                  Vence {new Date(goal.due_date).toLocaleDateString('es-CO')}
                </span>
              )}
            </div>
            <p className="mt-1.5 font-semibold text-gray-900">{goal.title}</p>
            {goal.description && <p className="mt-0.5 text-sm text-gray-500">{goal.description}</p>}
          </div>
          {isActive && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Actualizar progreso"
              className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
        </div>

        {goal.target_value != null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Progreso</span>
              <span className="font-semibold tabular-nums text-gray-900">
                {goal.current_value ?? 0} / {goal.target_value} {goal.unit ?? ''}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${pct ?? 0}%` }}
              />
            </div>
            {pct != null && <p className="mt-0.5 text-right text-xs text-gray-400">{pct}%</p>}
          </div>
        )}

        {goal.status === 'completed' && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            ¡Objetivo completado!
          </div>
        )}
      </div>

      {editing && <ProgressModal goal={goal} onClose={() => setEditing(false)} />}
    </>
  )
}

export function MyGoalsPanel() {
  const { data, isLoading } = trpc.employee.getMyGoals.useQuery()

  const active = (data ?? []).filter((g) => g.status === 'active')
  const completed = (data ?? []).filter((g) => g.status === 'completed')
  const cancelled = (data ?? []).filter((g) => g.status === 'cancelled')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis objetivos</h1>
        <p className="mt-0.5 text-sm text-gray-500">KPIs y metas asignadas por tu manager</p>
      </div>

      {/* Stats */}
      {data && data.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs text-blue-600">Activos</p>
            <p className="mt-0.5 text-2xl font-bold text-blue-700">{active.length}</p>
          </div>
          {completed.length > 0 && (
            <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
              <p className="text-xs text-green-600">Completados</p>
              <p className="mt-0.5 text-2xl font-bold text-green-700">{completed.length}</p>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-5">
          {active.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Objetivos activos
              </h2>
              <div className="space-y-3">
                {active.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Completados
              </h2>
              <div className="space-y-3">
                {completed.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            </div>
          )}

          {cancelled.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <XCircle className="h-4 w-4 text-gray-400" />
                Cancelados
              </h2>
              <div className="space-y-3">
                {cancelled.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Target className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Sin objetivos asignados</p>
          <p className="mt-1 max-w-xs text-xs text-gray-400">
            Tu manager puede asignarte objetivos y KPIs desde el panel de administración.
          </p>
        </div>
      )}
    </div>
  )
}
