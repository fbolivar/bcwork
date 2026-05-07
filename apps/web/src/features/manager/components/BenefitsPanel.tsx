'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Gift, Plus, X, Pencil, Trash2 } from 'lucide-react'

const BENEFIT_TYPES = [
  'Seguro de salud',
  'Auxilio de transporte',
  'Bono de alimentación',
  'Seguro de vida',
  'Bono de desempeño',
  'Auxilio educativo',
  'Celular corporativo',
  'Fondo de empleados',
  'Otro',
]

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  annual: 'Anual',
  one_time: 'Único',
}

function fmtCOP(n: number | null) {
  if (n === null || n === 0) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

export function BenefitsPanel() {
  const utils = trpc.useUtils()
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const [empId, setEmpId] = useState('')
  const [benefitType, setBenefitType] = useState('Seguro de salud')
  const [customType, setCustomType] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<'monthly' | 'annual' | 'one_time'>('monthly')
  const [active, setActive] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )
  const { data, isLoading } = trpc.manager.getEmployeeBenefits.useQuery({
    employee_id: selectedEmployee ?? undefined,
    active_only: !showInactive,
  })

  const upsert = trpc.manager.upsertBenefit.useMutation({
    onSuccess: () => {
      utils.manager.getEmployeeBenefits.invalidate()
      setShowForm(false)
      resetForm()
    },
  })
  const del = trpc.manager.deleteBenefit.useMutation({
    onSuccess: () => utils.manager.getEmployeeBenefits.invalidate(),
  })

  function resetForm() {
    setEditingId(null)
    setEmpId('')
    setBenefitType('Seguro de salud')
    setCustomType('')
    setDescription('')
    setAmount('')
    setFrequency('monthly')
    setActive(true)
    setStartDate('')
    setNotes('')
  }

  function openEdit(b: any, empIdVal: string) {
    setEditingId(b.id)
    setEmpId(empIdVal)
    setBenefitType(BENEFIT_TYPES.includes(b.benefit_type) ? b.benefit_type : 'Otro')
    setCustomType(BENEFIT_TYPES.includes(b.benefit_type) ? '' : b.benefit_type)
    setDescription(b.description ?? '')
    setAmount(b.amount?.toString() ?? '')
    setFrequency(b.frequency)
    setActive(b.active)
    setStartDate(b.start_date ?? '')
    setNotes(b.notes ?? '')
    setShowForm(true)
  }

  const memberList = (data?.members ?? []) as any[]
  const displayMembers = selectedEmployee
    ? memberList.filter((m: any) => m.id === selectedEmployee)
    : memberList

  // Summary totals
  const allBenefits = memberList.flatMap((m: any) => m.benefits as any[])
  const monthlyTotal = allBenefits
    .filter((b: any) => b.active && b.frequency === 'monthly')
    .reduce((s: number, b: any) => s + (b.amount ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Gestión de beneficios</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Beneficios y compensación no salarial por empleado
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Agregar beneficio
        </button>
      </div>

      {/* Summary */}
      {monthlyTotal > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-xs text-gray-500">Total beneficios mensuales del equipo</p>
          <p className="text-sm font-bold text-gray-800">{fmtCOP(monthlyTotal)}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedEmployee(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!selectedEmployee ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            Todos
          </button>
          {(members ?? []).map((m: any) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedEmployee(m.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${selectedEmployee === m.id ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {m.full_name ?? m.email}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Incluir inactivos
        </label>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : displayMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Gift className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay beneficios registrados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayMembers.map((m: any) => {
            const benefits = m.benefits as any[]
            return (
              <div
                key={m.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {(m.full_name ?? m.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{m.full_name ?? m.email}</p>
                    {m.department && <p className="text-[10px] text-gray-400">{m.department}</p>}
                  </div>
                  <span className="text-xs text-gray-400">{benefits.length} beneficios</span>
                </div>
                {benefits.length === 0 ? (
                  <div className="px-4 py-3 text-center text-sm text-gray-400">
                    Sin beneficios.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        resetForm()
                        setEmpId(m.id)
                        setShowForm(true)
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Agregar
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {benefits.map((b: any) => (
                      <div
                        key={b.id}
                        className={`flex items-center gap-3 px-4 py-2.5 ${!b.active ? 'opacity-50' : ''}`}
                      >
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{b.benefit_type}</p>
                          {b.description && (
                            <p className="text-xs text-gray-400">{b.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">{fmtCOP(b.amount)}</p>
                          <p className="text-[10px] text-gray-400">
                            {FREQ_LABELS[b.frequency] ?? b.frequency}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${b.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {b.active ? 'Activo' : 'Inactivo'}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(b, m.id)}
                            className="rounded p-1 text-gray-300 hover:text-blue-500"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => del.mutate({ id: b.id })}
                            className="rounded p-1 text-gray-300 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {editingId ? 'Editar beneficio' : 'Nuevo beneficio'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {!editingId && (
                <div>
                  <label className="text-xs font-medium text-gray-700">Empleado</label>
                  <select
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
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
              )}
              <div>
                <label className="text-xs font-medium text-gray-700">Tipo de beneficio</label>
                <select
                  value={benefitType}
                  onChange={(e) => setBenefitType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  {BENEFIT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {benefitType === 'Otro' && (
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="Especificar..."
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Valor (COP)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Frecuencia</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(FREQ_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Fecha inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Descripción (opcional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Beneficio activo
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={(!empId && !editingId) || upsert.isPending}
                onClick={() => {
                  const finalType = benefitType === 'Otro' ? customType || 'Otro' : benefitType
                  upsert.mutate({
                    id: editingId ?? undefined,
                    employee_id: empId,
                    benefit_type: finalType,
                    description: description || undefined,
                    amount: amount ? Number(amount) : undefined,
                    frequency,
                    active,
                    start_date: startDate || undefined,
                    notes: notes || undefined,
                  })
                }}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
