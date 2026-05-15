'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  Plus,
  X,
  Trash2,
  ClipboardList,
  Rocket,
  LogOut,
  CheckCircle2,
  Circle,
  Wand2,
} from 'lucide-react'

const CATEGORIES = ['general', 'legal', 'it', 'hr', 'training', 'equipment']

const PRESETS: Record<'onboarding' | 'offboarding', { title: string; category: string }[]> = {
  onboarding: [
    { title: 'Firmar contrato laboral', category: 'legal' },
    { title: 'Configurar correo corporativo', category: 'it' },
    { title: 'Entregar equipos de trabajo', category: 'equipment' },
    { title: 'Completar inducción corporativa', category: 'training' },
    { title: 'Registrar en nómina', category: 'hr' },
    { title: 'Conocer políticas internas', category: 'general' },
  ],
  offboarding: [
    { title: 'Devolver equipos de trabajo', category: 'equipment' },
    { title: 'Revocar accesos y credenciales', category: 'it' },
    { title: 'Firmar acuerdo de confidencialidad', category: 'legal' },
    { title: 'Entrevista de salida', category: 'hr' },
    { title: 'Liquidar prestaciones', category: 'hr' },
  ],
}

export function OnboardingManager() {
  const utils = trpc.useUtils()
  const [tab, setTab] = useState<'onboarding' | 'offboarding'>('onboarding')
  const [showCreate, setShowCreate] = useState(false)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [dueDate, setDueDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  const { data: tasks, isLoading } = trpc.admin.getOnboardingTasks.useQuery({
    task_type: tab,
    employee_id: filterEmployee || undefined,
  })
  const { data: usersData } = trpc.admin.listUsers.useQuery({ pageSize: 100 })

  const create = trpc.admin.createOnboardingTask.useMutation({
    onSuccess: () => {
      utils.admin.getOnboardingTasks.invalidate()
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setDueDate('')
      setEmployeeId('')
    },
  })

  const remove = trpc.admin.deleteOnboardingTask.useMutation({
    onSuccess: () => utils.admin.getOnboardingTasks.invalidate(),
  })

  const allTasks = (tasks ?? []) as any[]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Onboarding & Offboarding</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Gestiona las tareas de integración y salida
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva tarea
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
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
        <select
          title="Filtrar por empleado"
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todos los empleados</option>
          {(usersData?.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay tareas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allTasks.map((t: any) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
            >
              {t.completed_at ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-gray-300" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800">{t.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {t.users?.full_name ?? '—'} · {t.category}
                  {t.due_date &&
                    ` · Vence ${new Date(t.due_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`}
                </p>
              </div>
              <button
                type="button"
                title="Eliminar"
                onClick={() => remove.mutate({ id: t.id })}
                disabled={remove.isPending}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nueva tarea de {tab}</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <p className="w-full text-[10px] font-medium uppercase tracking-widest text-gray-400">
                <Wand2 className="mr-1 inline h-3 w-3" />
                Presets rápidos
              </p>
              {PRESETS[tab].map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    setTitle(p.title)
                    setCategory(p.category)
                  }}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  {p.title}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="ob-employee" className="text-xs font-medium text-gray-700">
                  Empleado
                </label>
                <select
                  id="ob-employee"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {(usersData?.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ob-title" className="text-xs font-medium text-gray-700">
                  Título
                </label>
                <input
                  id="ob-title"
                  type="text"
                  placeholder="Ej: Firmar contrato"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="ob-desc" className="text-xs font-medium text-gray-700">
                  Descripción (opcional)
                </label>
                <textarea
                  id="ob-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ob-cat" className="text-xs font-medium text-gray-700">
                    Categoría
                  </label>
                  <select
                    id="ob-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ob-due" className="text-xs font-medium text-gray-700">
                    Fecha límite
                  </label>
                  <input
                    id="ob-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
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
                    category,
                    due_date: dueDate || undefined,
                    task_type: tab,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear tarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
