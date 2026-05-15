'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Gift, Plus, X, Trash2 } from 'lucide-react'

type BenefitCategory =
  | 'health'
  | 'transport'
  | 'food'
  | 'equipment'
  | 'insurance'
  | 'bonus'
  | 'other'

const CAT_LABELS: Record<BenefitCategory, string> = {
  health: 'Salud',
  transport: 'Transporte',
  food: 'Alimentación',
  equipment: 'Equipos',
  insurance: 'Seguro',
  bonus: 'Bono',
  other: 'Otro',
}

const CAT_COLORS: Record<BenefitCategory, string> = {
  health: 'bg-red-100 text-red-600',
  transport: 'bg-blue-100 text-blue-700',
  food: 'bg-orange-100 text-orange-600',
  equipment: 'bg-gray-100 text-gray-600',
  insurance: 'bg-purple-100 text-purple-700',
  bonus: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-500',
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function BenefitsManager() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterCategory, setFilterCategory] = useState<BenefitCategory | ''>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<BenefitCategory>('health')
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [employeeId, setEmployeeId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const { data: benefits, isLoading } = trpc.admin.listBenefits.useQuery({
    employee_id: filterEmployee || undefined,
  })
  const { data: usersData } = trpc.admin.listUsers.useQuery({ pageSize: 100 })

  const create = trpc.admin.createBenefit.useMutation({
    onSuccess: () => {
      utils.admin.listBenefits.invalidate()
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setValue('')
      setEmployeeId('')
      setExpiresAt('')
    },
  })

  const remove = trpc.admin.deleteBenefit.useMutation({
    onSuccess: () => utils.admin.listBenefits.invalidate(),
  })

  const allBenefits = ((benefits ?? []) as any[]).filter(
    (b) => !filterCategory || b.category === filterCategory,
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Beneficios</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Gestiona el paquete de compensación del equipo
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo beneficio
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-wrap rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setFilterCategory('')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filterCategory === '' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Todos
          </button>
          {(Object.entries(CAT_LABELS) as [BenefitCategory, string][]).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterCategory(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filterCategory === k ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allBenefits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Gift className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay beneficios creados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allBenefits.map((b: any) => {
            const catColor = CAT_COLORS[b.category as BenefitCategory] ?? CAT_COLORS.other
            const catLabel = CAT_LABELS[b.category as BenefitCategory] ?? b.category
            return (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{b.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {b.users ? b.users.full_name : 'Toda la empresa'}
                    {b.value != null && ` · ${fmtCurrency(b.value, b.currency)}`}
                    {b.expires_at &&
                      ` · Vence ${new Date(b.expires_at + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${catColor}`}>
                  {catLabel}
                </span>
                <button
                  type="button"
                  title="Eliminar"
                  onClick={() => remove.mutate({ id: b.id })}
                  disabled={remove.isPending}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nuevo beneficio</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="ben-title" className="text-xs font-medium text-gray-700">
                  Título
                </label>
                <input
                  id="ben-title"
                  type="text"
                  placeholder="Ej: Seguro médico familiar"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ben-cat" className="text-xs font-medium text-gray-700">
                    Categoría
                  </label>
                  <select
                    id="ben-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BenefitCategory)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(CAT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ben-employee" className="text-xs font-medium text-gray-700">
                    Empleado
                  </label>
                  <select
                    id="ben-employee"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Toda la empresa</option>
                    {(usersData?.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ben-value" className="text-xs font-medium text-gray-700">
                    Valor (opcional)
                  </label>
                  <input
                    id="ben-value"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ben-cur" className="text-xs font-medium text-gray-700">
                    Moneda
                  </label>
                  <select
                    id="ben-cur"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="COP">COP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="ben-desc" className="text-xs font-medium text-gray-700">
                  Descripción (opcional)
                </label>
                <textarea
                  id="ben-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="ben-exp" className="text-xs font-medium text-gray-700">
                  Vence (opcional)
                </label>
                <input
                  id="ben-exp"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
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
                disabled={!title.trim() || create.isPending}
                onClick={() =>
                  create.mutate({
                    title,
                    description: description || undefined,
                    category,
                    value: value ? Number(value) : undefined,
                    currency,
                    employee_id: employeeId || undefined,
                    expires_at: expiresAt || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear beneficio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
