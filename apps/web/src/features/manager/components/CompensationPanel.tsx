'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { DollarSign, Plus, X, TrendingUp } from 'lucide-react'

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  salary: { label: 'Salario base', color: 'bg-blue-100 text-blue-700' },
  raise: { label: 'Aumento', color: 'bg-green-100 text-green-700' },
  bonus: { label: 'Bono', color: 'bg-purple-100 text-purple-700' },
  adjustment: { label: 'Ajuste', color: 'bg-orange-100 text-orange-700' },
}

function fmtCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CompensationPanel() {
  const utils = trpc.useUtils()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const [userId, setUserId] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [compType, setCompType] = useState<'salary' | 'bonus' | 'raise' | 'adjustment'>('salary')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )

  const { data, isLoading } = trpc.manager.getCompensationRecords.useQuery({
    teamId,
    userId: selectedUser ?? undefined,
  })
  const records = (data ?? []) as any[]

  const add = trpc.manager.addCompensationRecord.useMutation({
    onSuccess: () => {
      utils.manager.getCompensationRecords.invalidate()
      setShowAdd(false)
      setUserId('')
      setAmount('')
      setReason('')
      setNotes('')
    },
  })

  // Group by user for summary view
  const byUser = records.reduce((acc: Record<string, any[]>, r: any) => {
    if (!acc[r.user_id]) acc[r.user_id] = []
    acc[r.user_id]!.push(r)
    return acc
  }, {})

  const currentSalaryByUser: Record<string, number> = {}
  for (const [uid, recs] of Object.entries(byUser)) {
    const salaries = (recs as any[])
      .filter((r) => r.compensation_type === 'salary')
      .sort((a: any, b: any) => b.effective_date.localeCompare(a.effective_date))
    if (salaries.length > 0) currentSalaryByUser[uid] = salaries[0].salary_amount
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Compensación</h2>
          <p className="mt-0.5 text-sm text-gray-500">Historial salarial y bonos del equipo</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Registrar
        </button>
      </div>

      {/* Employee filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSelectedUser(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!selectedUser ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          Todos
        </button>
        {(members ?? []).map((m: any) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelectedUser(m.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${selectedUser === m.id ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {m.full_name ?? m.email}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <DollarSign className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Sin registros de compensación</p>
          <p className="mt-1 text-xs text-gray-400">Registra el salario actual de cada empleado</p>
        </div>
      ) : (
        <>
          {/* Summary cards (when not filtering by user) */}
          {!selectedUser && Object.keys(currentSalaryByUser).length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(members ?? [])
                .filter((m: any) => currentSalaryByUser[m.id])
                .map((m: any) => (
                  <div key={m.id} className="rounded-xl border border-gray-100 bg-white p-3">
                    <p className="truncate text-xs text-gray-500">{m.full_name ?? m.email}</p>
                    <p className="mt-1 text-base font-bold text-gray-800">
                      {fmtCOP(currentSalaryByUser[m.id]!)}
                    </p>
                    <p className="text-[10px] text-gray-400">Salario actual</p>
                  </div>
                ))}
            </div>
          )}

          {/* Timeline */}
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Empleado</th>
                  <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
                  <th className="px-4 py-2.5 text-right font-medium">Monto</th>
                  <th className="px-4 py-2.5 text-left font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {records.map((r: any) => {
                  const cfg = TYPE_CONFIG[r.compensation_type] ?? {
                    label: r.compensation_type,
                    color: 'bg-gray-100 text-gray-500',
                  }
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                            {(r.employee_name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-700">{r.employee_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {new Date(r.effective_date).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                        {fmtCOP(r.salary_amount)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{r.reason ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Registrar compensación</h3>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Empleado</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Tipo</label>
                  <select
                    value={compType}
                    onChange={(e) => setCompType(e.target.value as typeof compType)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Fecha efectiva</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Monto</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Moneda</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {['COP', 'USD', 'EUR'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Motivo</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Aumento por desempeño Q1 2026"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Notas internas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!userId || !amount || Number(amount) <= 0 || add.isPending}
                onClick={() =>
                  add.mutate({
                    user_id: userId,
                    effective_date: effectiveDate,
                    salary_amount: Number(amount),
                    currency,
                    compensation_type: compType,
                    reason: reason || undefined,
                    notes: notes || undefined,
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
    </div>
  )
}
