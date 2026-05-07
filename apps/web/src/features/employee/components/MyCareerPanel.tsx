'use client'

import { trpc } from '@/lib/trpc-client'
import { TrendingUp, CheckCircle2, Circle, Clock, Target } from 'lucide-react'

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: 'En progreso', icon: Clock, color: 'text-blue-500' },
  completed: { label: 'Completado', icon: CheckCircle2, color: 'text-green-500' },
}

export function MyCareerPanel() {
  const utils = trpc.useUtils()
  const { data: plan, isLoading } = trpc.employee.getMyCareerPlan.useQuery()

  const updateProgress = trpc.employee.updateCareerPlanProgress.useMutation({
    onSuccess: () => utils.employee.getMyCareerPlan.invalidate(),
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 rounded-xl bg-gray-100" />
        <div className="h-48 rounded-xl bg-gray-100" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Mi plan de carrera</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Trayectoria y objetivos de desarrollo profesional
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <TrendingUp className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Tu manager aún no ha creado un plan de carrera</p>
          <p className="mt-1 text-xs text-gray-400">Solicítalo en tu próxima reunión 1:1</p>
        </div>
      </div>
    )
  }

  const milestones = (plan.milestones ?? []) as any[]
  const total = milestones.length
  const completed = milestones.filter((m: any) => m.status === 'completed').length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  const daysToTarget = plan.target_date
    ? Math.ceil((new Date(plan.target_date).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Mi plan de carrera</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Trayectoria y objetivos de desarrollo profesional
        </p>
      </div>

      {/* Career path card */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-widest text-blue-400">
              Posición actual
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{plan.current_position}</p>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <div className="h-px flex-1 border-t-2 border-dashed border-blue-200" />
            <TrendingUp className="h-5 w-5 shrink-0 text-blue-400" />
            <div className="h-px flex-1 border-t-2 border-dashed border-blue-200" />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-widest text-indigo-400">
              Meta
            </p>
            <p className="mt-1 text-sm font-semibold text-indigo-700">{plan.target_role}</p>
          </div>
        </div>
        {daysToTarget !== null && (
          <p className="mt-3 text-center text-xs text-blue-400">
            <Target className="mr-1 inline h-3 w-3" />
            {daysToTarget > 0
              ? `${daysToTarget} días para la fecha objetivo (${new Date(plan.target_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })})`
              : 'Fecha objetivo alcanzada'}
          </p>
        )}
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">Progreso general</p>
            <p className="text-sm font-bold text-gray-800">{progress}%</p>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400">
            {completed} de {total} hitos completados
          </p>
        </div>
      )}

      {/* Milestones */}
      {milestones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
          <p className="text-sm text-gray-400">No hay hitos definidos aún</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Hitos</p>
          {milestones.map((m: any) => {
            const sc =
              STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
            const Icon = sc.icon
            const nextStatus =
              m.status === 'pending'
                ? 'in_progress'
                : m.status === 'in_progress'
                  ? 'completed'
                  : 'pending'
            return (
              <div
                key={m.id}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() =>
                    updateProgress.mutate({ milestone_id: m.id, status: nextStatus as any })
                  }
                  disabled={updateProgress.isPending}
                  className="mt-0.5 shrink-0"
                >
                  <Icon className={`h-4.5 w-4.5 ${sc.color}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${m.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}
                  >
                    {m.title}
                  </p>
                  {m.description && <p className="text-[11px] text-gray-400">{m.description}</p>}
                  {m.target_date && (
                    <p className="text-[10px] text-gray-300">
                      Meta:{' '}
                      {new Date(m.target_date).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    m.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : m.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {sc.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {plan.notes && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
            Notas del manager
          </p>
          <p className="mt-1 text-sm text-gray-600">{plan.notes}</p>
        </div>
      )}
    </div>
  )
}
