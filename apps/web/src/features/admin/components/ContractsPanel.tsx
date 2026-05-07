'use client'

import { useState } from 'react'
import { trpc as api } from '@/lib/trpc-client'
import { Plus, FileText, CheckCircle, Clock, XCircle, Send, AlertCircle } from 'lucide-react'

type ContractStatus = 'draft' | 'sent' | 'signed' | 'active' | 'terminated' | 'expired'
type ContractType = 'indefinido' | 'fijo' | 'obra' | 'prestacion_servicios' | 'aprendizaje'

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  signed: 'Firmado',
  active: 'Activo',
  terminated: 'Terminado',
  expired: 'Vencido',
}
const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  signed: 'bg-cyan-100 text-cyan-700',
  active: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-600',
  expired: 'bg-amber-100 text-amber-700',
}
const STATUS_ICONS: Record<ContractStatus, React.ElementType> = {
  draft: FileText,
  sent: Send,
  signed: CheckCircle,
  active: CheckCircle,
  terminated: XCircle,
  expired: AlertCircle,
}
const TYPE_LABELS: Record<ContractType, string> = {
  indefinido: 'Término indefinido',
  fijo: 'Término fijo',
  obra: 'Obra o labor',
  prestacion_servicios: 'Prestación de servicios',
  aprendizaje: 'Aprendizaje',
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface ContractForm {
  employee_id: string
  contract_type: ContractType
  start_date: string
  end_date: string
  salary: string
  position: string
  notes: string
}

const EMPTY_FORM: ContractForm = {
  employee_id: '',
  contract_type: 'indefinido',
  start_date: '',
  end_date: '',
  salary: '',
  position: '',
  notes: '',
}

export function ContractsPanel() {
  const utils = api.useUtils()
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ContractForm>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)

  const { data: contracts = [], isLoading } = api.admin.listContracts.useQuery({
    status: statusFilter || undefined,
  })
  const { data: usersData } = api.admin.listUsers.useQuery({
    role: 'all',
    status: 'all',
    page: 1,
    pageSize: 100,
  })
  const users = usersData?.data ?? []

  const upsert = api.admin.upsertContract.useMutation({
    onSuccess: () => {
      void utils.admin.listContracts.invalidate()
      setShowForm(false)
      setForm(EMPTY_FORM)
      setEditId(null)
    },
  })

  const updateStatus = api.admin.updateContractStatus.useMutation({
    onSuccess: () => void utils.admin.listContracts.invalidate(),
  })

  function openEdit(c: any) {
    setEditId(c.id)
    setForm({
      employee_id: c.employee_id,
      contract_type: c.contract_type,
      start_date: c.start_date?.slice(0, 10) ?? '',
      end_date: c.end_date?.slice(0, 10) ?? '',
      salary: c.salary?.toString() ?? '',
      position: c.position ?? '',
      notes: c.notes ?? '',
    })
    setShowForm(true)
  }

  function handleSubmit() {
    upsert.mutate({
      ...(editId ? { id: editId } : {}),
      employee_id: form.employee_id,
      contract_type: form.contract_type,
      start_date: form.start_date,
      end_date: form.end_date || undefined,
      salary: form.salary ? parseFloat(form.salary) : undefined,
      position: form.position || undefined,
      notes: form.notes || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Cargando contratos...
      </div>
    )
  }

  const statusCounts = (contracts as any[]).reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Resumen de estados */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((s) => {
          const Icon = STATUS_ICONS[s]
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`rounded-xl border p-3 text-center transition-colors ${
                statusFilter === s
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-100 bg-white hover:bg-gray-50'
              }`}
            >
              <Icon className="mx-auto mb-1 h-4 w-4 text-gray-400" />
              <p className="text-lg font-bold text-gray-800">{statusCounts[s] ?? 0}</p>
              <p className="text-[10px] text-gray-400">{STATUS_LABELS[s]}</p>
            </button>
          )
        })}
      </div>

      {/* Cabecera con botón */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {(contracts as any[]).length} contrato{(contracts as any[]).length !== 1 ? 's' : ''}
          {statusFilter ? ` en estado "${STATUS_LABELS[statusFilter as ContractStatus]}"` : ''}
        </p>
        <button
          type="button"
          onClick={() => {
            setEditId(null)
            setForm(EMPTY_FORM)
            setShowForm(!showForm)
          }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo contrato
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <p className="mb-4 text-sm font-semibold text-blue-900">
            {editId ? 'Editar contrato' : 'Nuevo contrato'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-600">Empleado</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {(users as any[]).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Tipo de contrato</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.contract_type}
                onChange={(e) =>
                  setForm({ ...form, contract_type: e.target.value as ContractType })
                }
              >
                {(Object.entries(TYPE_LABELS) as [ContractType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Cargo</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="Desarrollador Senior"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Fecha inicio</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Fecha fin (si aplica)</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Salario (COP)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                placeholder="2000000"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-600">Notas</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={!form.employee_id || !form.start_date || upsert.isPending}
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {upsert.isPending ? 'Guardando...' : editId ? 'Actualizar' : 'Crear contrato'}
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

      {/* Tabla de contratos */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        {(contracts as any[]).length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">Sin contratos registrados</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Empleado
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Tipo
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Inicio
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Fin
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Salario
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Estado
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {(contracts as any[]).map((c) => {
                const status = (c.status ?? 'draft') as ContractStatus
                const StatusIcon = STATUS_ICONS[status]
                const nextStatuses: ContractStatus[] =
                  status === 'draft'
                    ? ['sent']
                    : status === 'sent'
                      ? ['signed', 'active']
                      : status === 'signed'
                        ? ['active']
                        : status === 'active'
                          ? ['terminated']
                          : []
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {(c.users as any)?.full_name ?? '—'}
                      <br />
                      <span className="text-[10px] font-normal text-gray-400">
                        {c.position ?? ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {TYPE_LABELS[c.contract_type as ContractType] ?? c.contract_type}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(c.start_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(c.end_date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-700">{fmt(c.salary)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[status]}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="rounded border border-gray-200 px-2 py-0.5 text-[10px] hover:bg-gray-100"
                        >
                          Editar
                        </button>
                        {nextStatuses.map((ns) => (
                          <button
                            key={ns}
                            type="button"
                            disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: c.id, status: ns })}
                            className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 hover:bg-blue-100"
                          >
                            → {STATUS_LABELS[ns]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
