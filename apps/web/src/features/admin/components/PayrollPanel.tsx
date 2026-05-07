'use client'

import { useState } from 'react'
import { trpc as api } from '@/lib/trpc-client'
import {
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'

type PeriodStatus = 'draft' | 'processing' | 'paid' | 'cancelled'

const STATUS_LABELS: Record<PeriodStatus, string> = {
  draft: 'Borrador',
  processing: 'Procesando',
  paid: 'Pagado',
  cancelled: 'Cancelado',
}
const STATUS_COLORS: Record<PeriodStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  processing: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}
const STATUS_ICONS: Record<PeriodStatus, React.ElementType> = {
  draft: FileText,
  processing: Clock,
  paid: CheckCircle,
  cancelled: XCircle,
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface NewPeriodForm {
  label: string
  period_start: string
  period_end: string
  notes: string
}

export function PayrollPanel() {
  const utils = api.useUtils()
  const { data: periods = [], isLoading } = api.admin.listPayrollPeriods.useQuery()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewPeriodForm>({
    label: '',
    period_start: '',
    period_end: '',
    notes: '',
  })

  const createPeriod = api.admin.createPayrollPeriod.useMutation({
    onSuccess: () => {
      void utils.admin.listPayrollPeriods.invalidate()
      setShowForm(false)
      setForm({ label: '', period_start: '', period_end: '', notes: '' })
    },
  })

  const updateStatus = api.admin.updatePayrollPeriodStatus.useMutation({
    onSuccess: () => void utils.admin.listPayrollPeriods.invalidate(),
  })

  const { data: payslips = [] } = api.admin.listPayslips.useQuery(
    { period_id: expandedId ?? undefined },
    { enabled: !!expandedId },
  )

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Cargando nómina...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {periods.length} período{periods.length !== 1 ? 's' : ''} registrado
          {periods.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo período
        </button>
      </div>

      {/* Formulario nuevo período */}
      {showForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="mb-3 text-sm font-semibold text-blue-900">Nuevo período de nómina</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-600">
                Etiqueta (ej: Quincena 1 - Mayo 2026)
              </label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Quincena 1 - Mayo 2026"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Inicio</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.period_start}
                onChange={(e) => setForm({ ...form, period_start: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Fin</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.period_end}
                onChange={(e) => setForm({ ...form, period_end: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-600">Notas</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={
                !form.label || !form.period_start || !form.period_end || createPeriod.isPending
              }
              onClick={() => createPeriod.mutate(form)}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createPeriod.isPending ? 'Guardando...' : 'Crear período'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de períodos */}
      <div className="space-y-2">
        {periods.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">Sin períodos de nómina</p>
            <p className="text-xs text-gray-300">Crea el primer período para comenzar</p>
          </div>
        )}
        {(periods as any[]).map((p) => {
          const status = (p.status ?? 'draft') as PeriodStatus
          const StatusIcon = STATUS_ICONS[status]
          const isExpanded = expandedId === p.id
          return (
            <div key={p.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              {/* Cabecera del período */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="mr-1 text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                  <p className="text-xs text-gray-400">
                    {fmtDate(p.period_start)} — {fmtDate(p.period_end)}
                  </p>
                </div>
                <div className="hidden gap-4 sm:flex">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Bruto</p>
                    <p className="text-xs font-semibold text-gray-700">{fmt(p.total_gross)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Neto</p>
                    <p className="text-xs font-semibold text-green-700">{fmt(p.total_net)}</p>
                  </div>
                </div>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[status]}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {STATUS_LABELS[status]}
                </span>
                {status === 'draft' && (
                  <select
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none"
                    value={status}
                    onChange={(e) =>
                      updateStatus.mutate({ id: p.id, status: e.target.value as PeriodStatus })
                    }
                  >
                    <option value="draft">Borrador</option>
                    <option value="processing">Procesar</option>
                    <option value="paid">Marcar pagado</option>
                    <option value="cancelled">Cancelar</option>
                  </select>
                )}
              </div>

              {/* Detalle de colillas */}
              {isExpanded && (
                <div className="border-t border-gray-50 px-4 py-3">
                  {payslips.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">
                      Sin colillas en este período
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-[10px] uppercase tracking-widest text-gray-400">
                          <th className="pb-2 pr-3">Empleado</th>
                          <th className="pb-2 pr-3">Días</th>
                          <th className="pb-2 pr-3">Salario base</th>
                          <th className="pb-2 pr-3">Devengado</th>
                          <th className="pb-2 pr-3">Deducciones</th>
                          <th className="pb-2 text-right">Neto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(payslips as any[]).map((s) => (
                          <tr key={s.id} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 pr-3 font-medium text-gray-800">
                              {(s.users as any)?.full_name ?? '—'}
                              <br />
                              <span className="text-[10px] font-normal text-gray-400">
                                {(s.users as any)?.department ?? ''}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-gray-600">{s.worked_days ?? '—'}</td>
                            <td className="py-2 pr-3 text-gray-600">{fmt(s.base_salary)}</td>
                            <td className="py-2 pr-3 text-gray-600">{fmt(s.gross_amount)}</td>
                            <td className="py-2 pr-3 text-red-500">{fmt(s.deductions)}</td>
                            <td className="py-2 text-right font-semibold text-green-700">
                              {fmt(s.net_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
