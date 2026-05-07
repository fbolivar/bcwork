'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CalendarCheck, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react'

const LEAVE_TYPES = ['vacation', 'sick', 'personal', 'maternity', 'paternity', 'bereavement']
const TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacaciones',
  sick: 'Enfermedad',
  personal: 'Personal',
  maternity: 'Maternidad',
  paternity: 'Paternidad',
  bereavement: 'Duelo',
}

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function daysBar(used: number, total: number) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const color = pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-400'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400">
        {used}/{total}d
      </span>
    </div>
  )
}

export function LeaveBalancesPanel() {
  const utils = trpc.useUtils()
  const year = new Date().getFullYear()
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1)
  const [calYear] = useState(year)
  const [editingBalance, setEditingBalance] = useState<{
    employee_id: string
    leave_type: string
    total_days: number
    notes: string
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'balances' | 'calendar'>('balances')

  const { data, isLoading } = trpc.manager.getLeaveBalances.useQuery({ year })
  const { data: calData, isLoading: calLoading } = trpc.manager.getLeaveCalendar.useQuery({
    year: calYear,
    month: calMonth,
  })

  const upsert = trpc.manager.upsertLeaveBalance.useMutation({
    onSuccess: () => {
      utils.manager.getLeaveBalances.invalidate()
      setEditingBalance(null)
    },
  })

  const members = (data?.members ?? []) as any[]
  const calEvents = (calData ?? []) as any[]

  // Build calendar grid
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Saldos y calendario de ausencias</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Vacaciones disponibles y ausencias aprobadas por mes
        </p>
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === 'balances' ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          Saldos por empleado
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === 'calendar' ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          Calendario del equipo
        </button>
      </div>

      {activeTab === 'balances' && (
        <>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <CalendarCheck className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No hay empleados en el equipo</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Empleado</th>
                    {LEAVE_TYPES.map((t) => (
                      <th key={t} className="px-3 py-2.5 text-center font-medium">
                        {TYPE_LABELS[t]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {members.map((m: any) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                            {(m.full_name ?? m.email ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-800">
                              {m.full_name ?? m.email}
                            </p>
                            {m.department && (
                              <p className="text-[10px] text-gray-400">{m.department}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {LEAVE_TYPES.map((t) => {
                        const bal = m.balances?.[t]
                        const used = m.used?.[t] ?? 0
                        const total = bal?.total_days ?? 0
                        return (
                          <td key={t} className="px-3 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {total > 0 ? (
                                daysBar(used, total)
                              ) : (
                                <span className="text-[10px] text-gray-300">—</span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingBalance({
                                    employee_id: m.id,
                                    leave_type: t,
                                    total_days: total,
                                    notes: bal?.notes ?? '',
                                  })
                                }
                                className="text-gray-200 hover:text-blue-400"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCalMonth((m) => (m === 1 ? 12 : m - 1))}
              className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 text-gray-400" />
            </button>
            <p className="text-sm font-medium text-gray-800">
              {MONTHS[calMonth - 1]} {calYear}
            </p>
            <button
              type="button"
              onClick={() => setCalMonth((m) => (m === 12 ? 1 : m + 1))}
              className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {calLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
          ) : calEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center">
              <p className="text-sm text-gray-400">
                No hay ausencias aprobadas en {MONTHS[calMonth - 1]}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {calEvents.map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {(e.full_name ?? e.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{e.full_name ?? e.email}</p>
                    <p className="text-xs text-gray-400">
                      {TYPE_LABELS[e.type] ?? e.type} · {e.start_date} → {e.end_date}
                    </p>
                  </div>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-medium text-green-700">
                    {e.days_count} {Number(e.days_count) === 1 ? 'día' : 'días'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit balance modal */}
      {editingBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                Editar saldo — {TYPE_LABELS[editingBalance.leave_type]}
              </h3>
              <button
                type="button"
                onClick={() => setEditingBalance(null)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Días disponibles ({year})
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  step={0.5}
                  value={editingBalance.total_days}
                  onChange={(e) =>
                    setEditingBalance({ ...editingBalance, total_days: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Notas (opcional)</label>
                <input
                  type="text"
                  value={editingBalance.notes}
                  onChange={(e) => setEditingBalance({ ...editingBalance, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingBalance(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={upsert.isPending}
                onClick={() =>
                  upsert.mutate({
                    employee_id: editingBalance.employee_id,
                    leave_type: editingBalance.leave_type,
                    year,
                    total_days: editingBalance.total_days,
                    notes: editingBalance.notes || undefined,
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
