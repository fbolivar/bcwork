'use client'

import { useState } from 'react'
import { trpc as api } from '@/lib/trpc-client'
import { Plus, CheckCircle, Clock, AlertTriangle, MinusCircle, ShieldCheck } from 'lucide-react'

type ComplianceStatus = 'pending' | 'completed' | 'overdue' | 'na'
type ComplianceCategory =
  | 'sgsst'
  | 'arl'
  | 'eps'
  | 'pension'
  | 'caja_compensacion'
  | 'contrato'
  | 'induccion'
  | 'examen_medico'
  | 'capacitacion'
  | 'otro'

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  overdue: 'Vencido',
  na: 'N/A',
}
const STATUS_COLORS: Record<ComplianceStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-600',
  na: 'bg-gray-100 text-gray-500',
}
const STATUS_ICONS: Record<ComplianceStatus, React.ElementType> = {
  pending: Clock,
  completed: CheckCircle,
  overdue: AlertTriangle,
  na: MinusCircle,
}
const CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  sgsst: 'SGSST',
  arl: 'ARL',
  eps: 'EPS',
  pension: 'Pensión',
  caja_compensacion: 'Caja compensación',
  contrato: 'Contrato',
  induccion: 'Inducción',
  examen_medico: 'Examen médico',
  capacitacion: 'Capacitación',
  otro: 'Otro',
}
const CATEGORY_COLORS: Record<ComplianceCategory, string> = {
  sgsst: 'bg-purple-100 text-purple-700',
  arl: 'bg-blue-100 text-blue-700',
  eps: 'bg-cyan-100 text-cyan-700',
  pension: 'bg-indigo-100 text-indigo-700',
  caja_compensacion: 'bg-teal-100 text-teal-700',
  contrato: 'bg-green-100 text-green-700',
  induccion: 'bg-lime-100 text-lime-700',
  examen_medico: 'bg-pink-100 text-pink-700',
  capacitacion: 'bg-amber-100 text-amber-700',
  otro: 'bg-gray-100 text-gray-600',
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface ReqForm {
  employee_id: string
  category: ComplianceCategory
  title: string
  description: string
  due_date: string
  is_company_wide: boolean
}

const EMPTY_FORM: ReqForm = {
  employee_id: '',
  category: 'sgsst',
  title: '',
  description: '',
  due_date: '',
  is_company_wide: false,
}

export function CompliancePanel() {
  const utils = api.useUtils()
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | ''>('')
  const [catFilter, setCatFilter] = useState<ComplianceCategory | ''>('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ReqForm>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)

  const { data: items = [], isLoading } = api.admin.listComplianceRequirements.useQuery({
    status: statusFilter || undefined,
    category: catFilter || undefined,
  })
  const { data: usersData } = api.admin.listUsers.useQuery({
    role: 'all',
    status: 'all',
    page: 1,
    pageSize: 100,
  })
  const users = usersData?.data ?? []

  const upsert = api.admin.upsertComplianceRequirement.useMutation({
    onSuccess: () => {
      void utils.admin.listComplianceRequirements.invalidate()
      setShowForm(false)
      setForm(EMPTY_FORM)
      setEditId(null)
    },
  })
  const complete = api.admin.completeComplianceRequirement.useMutation({
    onSuccess: () => void utils.admin.listComplianceRequirements.invalidate(),
  })
  const remove = api.admin.deleteComplianceRequirement.useMutation({
    onSuccess: () => void utils.admin.listComplianceRequirements.invalidate(),
  })

  function openEdit(item: any) {
    setEditId(item.id)
    setForm({
      employee_id: item.employee_id ?? '',
      category: item.category,
      title: item.title,
      description: item.description ?? '',
      due_date: item.due_date?.slice(0, 10) ?? '',
      is_company_wide: item.is_company_wide ?? false,
    })
    setShowForm(true)
  }

  function handleSubmit() {
    upsert.mutate({
      ...(editId ? { id: editId } : {}),
      employee_id: form.employee_id || undefined,
      category: form.category,
      title: form.title,
      description: form.description || undefined,
      due_date: form.due_date || undefined,
      is_company_wide: form.is_company_wide,
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Cargando cumplimiento...
      </div>
    )
  }

  const allItems = items as any[]
  const counts = allItems.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1
    return acc
  }, {})
  const overdue = allItems.filter((i) => i.status === 'overdue').length
  const completionRate =
    allItems.length > 0 ? Math.round(((counts.completed ?? 0) / allItems.length) * 100) : 0

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <ShieldCheck className="mx-auto mb-1 h-5 w-5 text-blue-500" />
          <p className="text-2xl font-bold text-gray-800">{allItems.length}</p>
          <p className="text-xs text-gray-400">Total requerimientos</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-500" />
          <p className="text-2xl font-bold text-green-700">{completionRate}%</p>
          <p className="text-xs text-gray-400">Cumplimiento</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <Clock className="mx-auto mb-1 h-5 w-5 text-amber-500" />
          <p className="text-2xl font-bold text-amber-700">{counts.pending ?? 0}</p>
          <p className="text-xs text-gray-400">Pendientes</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
          <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-red-500" />
          <p className="text-2xl font-bold text-red-600">{overdue}</p>
          <p className="text-xs text-gray-400">Vencidos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(['', 'pending', 'overdue', 'completed', 'na'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === '' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <select
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as ComplianceCategory | '')}
        >
          <option value="">Todas las categorías</option>
          {(Object.entries(CATEGORY_LABELS) as [ComplianceCategory, string][]).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setEditId(null)
            setForm(EMPTY_FORM)
            setShowForm(!showForm)
          }}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar requerimiento
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <p className="mb-4 text-sm font-semibold text-blue-900">
            {editId ? 'Editar requerimiento' : 'Nuevo requerimiento'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Categoría</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as ComplianceCategory })
                }
              >
                {(Object.entries(CATEGORY_LABELS) as [ComplianceCategory, string][]).map(
                  ([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Empleado (vacío = empresa)</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.employee_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    employee_id: e.target.value,
                    is_company_wide: !e.target.value,
                  })
                }
              >
                <option value="">Toda la empresa</option>
                {(users as any[]).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-600">Título</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Afiliación EPS obligatoria"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-600">Descripción</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Fecha límite</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={!form.title || upsert.isPending}
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {upsert.isPending ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditId(null)
                setForm(EMPTY_FORM)
              }}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {allItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
            <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">Sin requerimientos registrados</p>
            <p className="text-xs text-gray-300">Agrega los requisitos legales de tu empresa</p>
          </div>
        )}
        {allItems.map((item) => {
          const status = (item.status ?? 'pending') as ComplianceStatus
          const category = (item.category ?? 'otro') as ComplianceCategory
          const StatusIcon = STATUS_ICONS[status]
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border bg-white p-4 ${
                status === 'overdue' ? 'border-red-100' : 'border-gray-100'
              }`}
            >
              <StatusIcon
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  status === 'completed'
                    ? 'text-green-500'
                    : status === 'overdue'
                      ? 'text-red-500'
                      : status === 'na'
                        ? 'text-gray-300'
                        : 'text-amber-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[category]}`}
                  >
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[status]}`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-gray-400">
                  {item.employee_id ? (
                    <span>👤 {(item.users as any)?.full_name ?? 'Empleado'}</span>
                  ) : (
                    <span>🏢 Toda la empresa</span>
                  )}
                  {item.due_date && <span>📅 Vence: {fmtDate(item.due_date)}</span>}
                  {item.completed_at && <span>✅ Completado: {fmtDate(item.completed_at)}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {status !== 'completed' && status !== 'na' && (
                  <button
                    type="button"
                    disabled={complete.isPending}
                    onClick={() => complete.mutate({ id: item.id })}
                    className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 hover:bg-green-100"
                  >
                    Completar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="rounded border border-gray-200 px-2 py-0.5 text-[10px] hover:bg-gray-100"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm('¿Eliminar este requerimiento?')) remove.mutate({ id: item.id })
                  }}
                  className="rounded border border-red-100 px-2 py-0.5 text-[10px] text-red-500 hover:bg-red-50"
                >
                  ×
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
