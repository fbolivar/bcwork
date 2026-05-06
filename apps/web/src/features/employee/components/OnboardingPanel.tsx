'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CheckCircle2, Circle, ClipboardList, Rocket, LogOut } from 'lucide-react'

const CAT_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-600',
  legal: 'bg-purple-100 text-purple-700',
  it: 'bg-blue-100 text-blue-700',
  hr: 'bg-green-100 text-green-700',
  training: 'bg-yellow-100 text-yellow-700',
  equipment: 'bg-orange-100 text-orange-700',
}

export function OnboardingPanel() {
  const utils = trpc.useUtils()
  const [tab, setTab] = useState<'onboarding' | 'offboarding'>('onboarding')

  const { data: tasks, isLoading } = trpc.employee.getMyOnboardingTasks.useQuery({ task_type: tab })

  const complete = trpc.employee.completeOnboardingTask.useMutation({
    onSuccess: () => utils.employee.getMyOnboardingTasks.invalidate(),
  })

  const allTasks = tasks ?? []
  const done = allTasks.filter((t) => t.completed_at).length
  const pct = allTasks.length > 0 ? Math.round((done / allTasks.length) * 100) : 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {tab === 'onboarding' ? 'Mi onboarding' : 'Mi offboarding'}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {tab === 'onboarding'
            ? 'Tareas para integrarte al equipo'
            : 'Proceso de salida de la empresa'}
        </p>
      </div>

      <div className="flex w-fit self-start rounded-lg border border-gray-200 bg-white p-0.5">
        {(['onboarding', 'offboarding'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {t === 'onboarding' ? (
              <Rocket className="h-3.5 w-3.5" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            {t === 'onboarding' ? 'Onboarding' : 'Offboarding'}
          </button>
        ))}
      </div>

      {!isLoading && allTasks.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Progreso</span>
            <span className="font-bold text-blue-600">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            {done} de {allTasks.length} tareas completadas
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No hay tareas asignadas</p>
          <p className="mt-1 text-xs text-gray-400">Tu manager las asignará pronto</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allTasks.map((t) => {
            const isDone = !!t.completed_at
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => complete.mutate({ id: t.id, completed: !isDone })}
                disabled={complete.isPending}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${isDone ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50'}`}
              >
                {isDone ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}
                  >
                    {t.title}
                  </p>
                  {t.description && <p className="mt-0.5 text-xs text-gray-400">{t.description}</p>}
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${CAT_COLORS[t.category] ?? CAT_COLORS.general}`}
                    >
                      {t.category}
                    </span>
                    {t.due_date && (
                      <span className="text-xs text-gray-400">
                        Vence{' '}
                        {new Date(t.due_date + 'T12:00:00').toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
