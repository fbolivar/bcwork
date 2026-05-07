'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { TrendingUp, Plus, X, Pencil, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react'

const MILESTONE_STATUS = {
  pending: { label: 'Pendiente', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: 'En progreso', icon: Clock, color: 'text-blue-500' },
  completed: { label: 'Completado', icon: CheckCircle2, color: 'text-green-500' },
}

function MilestoneStatusIcon({ status }: { status: string }) {
  const cfg = MILESTONE_STATUS[status as keyof typeof MILESTONE_STATUS] ?? MILESTONE_STATUS.pending
  const Icon = cfg.icon
  return <Icon className={`h-4 w-4 ${cfg.color}`} />
}

export function CareerPlansPanel() {
  const utils = trpc.useUtils()
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<any>(null)

  const [planCurrentPos, setPlanCurrentPos] = useState('')
  const [planTargetRole, setPlanTargetRole] = useState('')
  const [planTargetDate, setPlanTargetDate] = useState('')
  const [planNotes, setPlanNotes] = useState('')

  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDesc, setMilestoneDesc] = useState('')
  const [milestoneDate, setMilestoneDate] = useState('')

  const { data, isLoading } = trpc.manager.getTeamCareerPlans.useQuery()

  const upsertPlan = trpc.manager.upsertCareerPlan.useMutation({
    onSuccess: () => {
      utils.manager.getTeamCareerPlans.invalidate()
      setShowPlanForm(false)
      resetPlanForm()
      if (selectedEmployee) {
        const updated = (data ?? []).find((e: any) => e.id === selectedEmployee.id)
        if (updated) setSelectedEmployee(updated)
      }
    },
  })

  const deletePlan = trpc.manager.deleteCareerPlan.useMutation({
    onSuccess: () => {
      utils.manager.getTeamCareerPlans.invalidate()
      setSelectedEmployee((prev: any) => (prev ? { ...prev, career_plan: null } : null))
    },
  })

  const addMilestone = trpc.manager.addCareerMilestone.useMutation({
    onSuccess: () => {
      utils.manager.getTeamCareerPlans.invalidate()
      setShowMilestoneForm(false)
      resetMilestoneForm()
    },
  })

  const updateMilestone = trpc.manager.updateCareerMilestone.useMutation({
    onSuccess: () => utils.manager.getTeamCareerPlans.invalidate(),
  })

  const deleteMilestone = trpc.manager.deleteCareerMilestone.useMutation({
    onSuccess: () => utils.manager.getTeamCareerPlans.invalidate(),
  })

  function resetPlanForm() {
    setEditingPlan(null)
    setPlanCurrentPos('')
    setPlanTargetRole('')
    setPlanTargetDate('')
    setPlanNotes('')
  }

  function resetMilestoneForm() {
    setMilestoneTitle('')
    setMilestoneDesc('')
    setMilestoneDate('')
  }

  function openEditPlan(plan: any) {
    setEditingPlan(plan)
    setPlanCurrentPos(plan.current_position ?? '')
    setPlanTargetRole(plan.target_role ?? '')
    setPlanTargetDate(plan.target_date?.slice(0, 10) ?? '')
    setPlanNotes(plan.notes ?? '')
    setShowPlanForm(true)
  }

  function cycleMilestoneStatus(m: any) {
    const order = ['pending', 'in_progress', 'completed']
    const idx = order.indexOf(m.status ?? 'pending')
    const next = order[(idx + 1) % order.length]!
    updateMilestone.mutate({ id: m.id, status: next as 'pending' | 'in_progress' | 'completed' })
  }

  const employees = (data ?? []) as any[]
  const currentEmployee = selectedEmployee
    ? (employees.find((e: any) => e.id === selectedEmployee.id) ?? selectedEmployee)
    : null
  const plan = currentEmployee?.career_plan ?? null
  const milestones = (plan?.career_milestones ?? []).sort(
    (a: any, b: any) => a.sort_order - b.sort_order,
  )

  const withPlan = employees.filter((e: any) => e.career_plan)
  const withoutPlan = employees.filter((e: any) => !e.career_plan)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Planes de carrera</h2>
          <p className="mt-0.5 text-sm text-gray-500">Desarrollo profesional del equipo</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
            {withPlan.length} con plan
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
            {withoutPlan.length} sin plan
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Employee list */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Equipo ({employees.length})
          </p>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center">
              <p className="text-sm text-gray-500">Sin miembros en el equipo</p>
            </div>
          ) : (
            employees.map((e: any) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedEmployee(e)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${currentEmployee?.id === e.id ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {(e.full_name ?? e.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {e.full_name ?? e.email}
                    </p>
                    <p className="truncate text-[10px] text-gray-400">
                      {e.position ?? e.department ?? '—'}
                    </p>
                  </div>
                  {e.career_plan ? (
                    <div className="h-2 w-2 rounded-full bg-green-400" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-200" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Career plan detail */}
        <div className="lg:col-span-2">
          {!currentEmployee ? (
            <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-gray-200">
              <div className="text-center">
                <TrendingUp className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-400">Selecciona un empleado</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Employee header */}
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {(currentEmployee.full_name ?? currentEmployee.email ?? '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {currentEmployee.full_name ?? currentEmployee.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      {currentEmployee.position ?? currentEmployee.department ?? '—'}
                    </p>
                  </div>
                </div>
                {!plan && (
                  <button
                    type="button"
                    onClick={() => {
                      resetPlanForm()
                      setPlanCurrentPos(currentEmployee.position ?? '')
                      setShowPlanForm(true)
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Crear plan
                  </button>
                )}
              </div>

              {plan ? (
                <>
                  {/* Plan card */}
                  <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-white px-3 py-1.5 shadow-sm">
                            <p className="text-[10px] text-gray-400">Posición actual</p>
                            <p className="text-sm font-semibold text-gray-800">
                              {plan.current_position}
                            </p>
                          </div>
                          <div className="text-gray-300">→</div>
                          <div className="rounded-lg bg-blue-600 px-3 py-1.5 shadow-sm">
                            <p className="text-[10px] text-blue-200">Objetivo</p>
                            <p className="text-sm font-semibold text-white">{plan.target_role}</p>
                          </div>
                        </div>
                        {plan.target_date && (
                          <p className="text-xs text-blue-600">
                            Meta:{' '}
                            {new Date(plan.target_date).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                            })}
                          </p>
                        )}
                        {plan.notes && <p className="text-xs text-gray-500">{plan.notes}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditPlan(plan)}
                          className="rounded p-1.5 text-blue-300 hover:text-blue-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePlan.mutate({ id: plan.id })}
                          className="rounded p-1.5 text-blue-300 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Hitos ({milestones.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          resetMilestoneForm()
                          setShowMilestoneForm(true)
                        }}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50"
                      >
                        <Plus className="h-3 w-3" /> Hito
                      </button>
                    </div>
                    {milestones.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center">
                        <p className="text-xs text-gray-400">Sin hitos definidos</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {milestones.map((m: any) => (
                          <div
                            key={m.id}
                            className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5"
                          >
                            <button
                              type="button"
                              onClick={() => cycleMilestoneStatus(m)}
                              className="mt-0.5 shrink-0"
                              title="Cambiar estado"
                            >
                              <MilestoneStatusIcon status={m.status} />
                            </button>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm font-medium ${m.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}
                              >
                                {m.title}
                              </p>
                              {m.description && (
                                <p className="text-[11px] text-gray-400">{m.description}</p>
                              )}
                              {m.target_date && (
                                <p className="text-[10px] text-gray-400">
                                  {new Date(m.target_date).toLocaleDateString('es-CO')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteMilestone.mutate({ id: m.id })}
                              className="shrink-0 rounded p-1 text-gray-200 hover:text-red-400"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
                  <TrendingUp className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">Sin plan de carrera</p>
                  <button
                    type="button"
                    onClick={() => {
                      resetPlanForm()
                      setPlanCurrentPos(currentEmployee.position ?? '')
                      setShowPlanForm(true)
                    }}
                    className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Crear plan de carrera
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plan form modal */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {editingPlan ? 'Editar plan' : 'Nuevo plan de carrera'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPlanForm(false)
                  resetPlanForm()
                }}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Posición actual</label>
                <input
                  type="text"
                  value={planCurrentPos}
                  onChange={(e) => setPlanCurrentPos(e.target.value)}
                  placeholder="Ej: Desarrollador Junior"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Rol objetivo</label>
                <input
                  type="text"
                  value={planTargetRole}
                  onChange={(e) => setPlanTargetRole(e.target.value)}
                  placeholder="Ej: Tech Lead"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Fecha objetivo (opcional)
                </label>
                <input
                  type="date"
                  value={planTargetDate}
                  onChange={(e) => setPlanTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Notas (opcional)</label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPlanForm(false)
                  resetPlanForm()
                }}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!planCurrentPos.trim() || !planTargetRole.trim() || upsertPlan.isPending}
                onClick={() =>
                  upsertPlan.mutate({
                    id: editingPlan?.id,
                    user_id: currentEmployee!.id,
                    current_position: planCurrentPos.trim(),
                    target_role: planTargetRole.trim(),
                    target_date: planTargetDate || undefined,
                    notes: planNotes || undefined,
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

      {/* Milestone form modal */}
      {showMilestoneForm && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Agregar hito</h3>
              <button
                type="button"
                onClick={() => {
                  setShowMilestoneForm(false)
                  resetMilestoneForm()
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
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="Ej: Completar curso de liderazgo"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Descripción (opcional)</label>
                <textarea
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Fecha objetivo (opcional)
                </label>
                <input
                  type="date"
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMilestoneForm(false)
                  resetMilestoneForm()
                }}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!milestoneTitle.trim() || addMilestone.isPending}
                onClick={() =>
                  addMilestone.mutate({
                    career_plan_id: plan.id,
                    title: milestoneTitle.trim(),
                    description: milestoneDesc || undefined,
                    target_date: milestoneDate || undefined,
                    sort_order: milestones.length,
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
    </div>
  )
}
