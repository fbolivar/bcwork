'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, X, DollarSign, Send } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  issued: { label: 'Emitido', color: 'bg-blue-100 text-blue-700' },
  acknowledged: { label: 'Confirmado', color: 'bg-green-100 text-green-700' },
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PayslipsManager() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [periodLabel, setPeriodLabel] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [gross, setGross] = useState('')
  const [deductions, setDeductions] = useState('0')
  const [currency, setCurrency] = useState('COP')
  const [hoursWorked, setHoursWorked] = useState('')
  const [notes, setNotes] = useState('')
  const [issueNow, setIssueNow] = useState(true)

  const { data: payslips, isLoading } = trpc.admin.getPayslips.useQuery({})
  const { data: usersData } = trpc.admin.listUsers.useQuery({ pageSize: 100 })

  const create = trpc.admin.createPayslip.useMutation({
    onSuccess: () => {
      utils.admin.getPayslips.invalidate()
      setShowCreate(false)
      setEmployeeId('')
      setPeriodLabel('')
      setPeriodStart('')
      setPeriodEnd('')
      setGross('')
      setDeductions('0')
      setHoursWorked('')
      setNotes('')
    },
  })

  const updateStatus = trpc.admin.updatePayslipStatus.useMutation({
    onSuccess: () => utils.admin.getPayslips.invalidate(),
  })

  const net = (Number(gross) || 0) - (Number(deductions) || 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recibos de nómina</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Emite y gestiona los recibos de pago del equipo
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo recibo
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (payslips ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <DollarSign className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay recibos creados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {((payslips ?? []) as any[]).map((raw) => {
            type PS = {
              id: string
              period_label: string
              period_start: string
              period_end: string
              gross_amount: number
              deductions: number
              net_amount: number
              currency: string
              status: string
              hours_worked: number | null
              users?: { full_name: string; email: string } | null
            }
            const p = raw as PS
            const st = STATUS_MAP[p.status] ?? STATUS_MAP.draft
            return (
              <div key={p.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {p.users?.full_name ?? '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {p.period_label} · {p.users?.email}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st?.color ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {st?.label ?? p.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-400">Bruto</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {fmtCurrency(Number(p.gross_amount), p.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Deducciones</p>
                    <p className="text-sm font-semibold text-red-500">
                      -{fmtCurrency(Number(p.deductions), p.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Neto</p>
                    <p className="text-sm font-bold text-green-700">
                      {fmtCurrency(Number(p.net_amount), p.currency)}
                    </p>
                  </div>
                </div>
                {p.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => updateStatus.mutate({ id: p.id, status: 'issued' })}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Emitir al empleado
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nuevo recibo de nómina</h3>
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
                <label htmlFor="ps-employee" className="text-xs font-medium text-gray-700">
                  Empleado
                </label>
                <select
                  id="ps-employee"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar empleado...</option>
                  {(usersData?.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} — {u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ps-label" className="text-xs font-medium text-gray-700">
                  Período
                </label>
                <input
                  id="ps-label"
                  type="text"
                  placeholder="Ej: Abril 2025"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ps-start" className="text-xs font-medium text-gray-700">
                    Inicio
                  </label>
                  <input
                    id="ps-start"
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ps-end" className="text-xs font-medium text-gray-700">
                    Fin
                  </label>
                  <input
                    id="ps-end"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ps-gross" className="text-xs font-medium text-gray-700">
                    Salario bruto
                  </label>
                  <input
                    id="ps-gross"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={gross}
                    onChange={(e) => setGross(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="ps-ded" className="text-xs font-medium text-gray-700">
                    Deducciones
                  </label>
                  <input
                    id="ps-ded"
                    type="number"
                    min="0"
                    step="1000"
                    value={deductions}
                    onChange={(e) => setDeductions(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {gross && (
                <div className="rounded-lg bg-green-50 px-3 py-2 text-sm">
                  Neto:{' '}
                  <span className="font-bold text-green-700">{fmtCurrency(net, currency)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ps-hours" className="text-xs font-medium text-gray-700">
                    Horas trabajadas
                  </label>
                  <input
                    id="ps-hours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="0"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ps-currency" className="text-xs font-medium text-gray-700">
                    Moneda
                  </label>
                  <select
                    id="ps-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="COP">COP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="ps-notes" className="text-xs font-medium text-gray-700">
                  Notas (opcional)
                </label>
                <textarea
                  id="ps-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={issueNow}
                  onChange={(e) => setIssueNow(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Emitir inmediatamente al empleado
              </label>
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
                disabled={
                  !employeeId ||
                  !periodLabel ||
                  !periodStart ||
                  !periodEnd ||
                  !gross ||
                  create.isPending
                }
                onClick={() =>
                  create.mutate({
                    employee_id: employeeId,
                    period_label: periodLabel,
                    period_start: periodStart,
                    period_end: periodEnd,
                    gross_amount: Number(gross),
                    deductions: Number(deductions),
                    currency,
                    hours_worked: hoursWorked ? Number(hoursWorked) : undefined,
                    notes: notes || undefined,
                    issue_now: issueNow,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear recibo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
