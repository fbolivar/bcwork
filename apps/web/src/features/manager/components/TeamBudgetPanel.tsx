'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { DollarSign, Edit2, Check, X } from 'lucide-react'

function fmtCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTHS = [
  '',
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

export function TeamBudgetPanel() {
  const utils = trpc.useUtils()
  const [period, setPeriod] = useState(currentMonth())
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id

  const { data: budget, isLoading } = trpc.manager.getTeamExpenseBudget.useQuery(
    { period_month: period, teamId },
    { enabled: true },
  )

  const setBudget = trpc.manager.setExpenseBudget.useMutation({
    onSuccess: () => {
      utils.manager.getTeamExpenseBudget.invalidate()
      setEditing(false)
    },
  })

  const b = budget as any

  function prevMonth() {
    const parts = period.split('-').map(Number)
    const y = parts[0] ?? 2025
    const m = parts[1] ?? 1
    if (m === 1) setPeriod(`${y - 1}-12`)
    else setPeriod(`${y}-${String(m - 1).padStart(2, '0')}`)
  }
  function nextMonth() {
    const parts = period.split('-').map(Number)
    const y = parts[0] ?? 2025
    const m = parts[1] ?? 1
    if (m === 12) setPeriod(`${y + 1}-01`)
    else setPeriod(`${y}-${String(m + 1).padStart(2, '0')}`)
  }

  const parts = period.split('-').map(Number)
  const y = parts[0] ?? 2025
  const m = parts[1] ?? 1
  const monthLabel = `${MONTHS[m] ?? ''} ${y}`

  const pctUsed = b?.pct_used ?? null
  const barColor =
    pctUsed === null
      ? 'bg-gray-200'
      : pctUsed >= 100
        ? 'bg-red-500'
        : pctUsed >= 80
          ? 'bg-orange-400'
          : 'bg-green-500'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Presupuesto de gastos</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Control del gasto del equipo vs presupuesto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs hover:bg-gray-50"
          >
            ←
          </button>
          <span className="w-32 text-center text-sm font-medium text-gray-700">{monthLabel}</span>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-32 rounded-xl bg-gray-100" />
          <div className="h-48 rounded-xl bg-gray-100" />
        </div>
      ) : (
        <>
          {/* Budget card */}
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Presupuesto total del mes</p>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => {
                    setBudgetInput(String(b?.total_budget ?? 0))
                    setEditing(true)
                  }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <Edit2 className="h-3 w-3" /> Editar
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-32 rounded-lg border border-blue-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setBudget.mutate({
                        period_month: period,
                        budget_amount: Number(budgetInput),
                        teamId,
                      })
                    }
                    disabled={setBudget.isPending}
                    className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {b?.total_budget > 0 ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-gray-900">{fmtCOP(b.total_spent)}</p>
                  <p className="text-sm text-gray-400">de {fmtCOP(b.total_budget)}</p>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-3 rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(pctUsed ?? 0, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{pctUsed}% utilizado</span>
                  <span className={b.remaining >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {b.remaining >= 0
                      ? `${fmtCOP(b.remaining)} disponible`
                      : `${fmtCOP(Math.abs(b.remaining))} sobre presupuesto`}
                  </span>
                </div>
                {b.total_pending > 0 && (
                  <p className="text-xs text-yellow-600">
                    + {fmtCOP(b.total_pending)} pendiente de aprobación
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 text-center">
                <DollarSign className="mx-auto h-8 w-8 text-gray-200" />
                <p className="mt-2 text-sm text-gray-400">Sin presupuesto definido para este mes</p>
                <button
                  type="button"
                  onClick={() => {
                    setBudgetInput('')
                    setEditing(true)
                  }}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Definir presupuesto
                </button>
              </div>
            )}
          </div>

          {/* By category */}
          {b?.by_category?.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="mb-3 text-xs font-medium text-gray-500">Gasto por categoría</p>
              <div className="space-y-2">
                {(b.by_category as any[])
                  .sort((a: any, _b: any) => _b.spent - a.spent)
                  .map((cat: any) => {
                    const catPct =
                      b.total_budget > 0 ? Math.round((cat.spent / b.total_budget) * 100) : null
                    return (
                      <div key={cat.category} className="flex items-center gap-3">
                        <span className="w-28 truncate text-xs text-gray-600">{cat.category}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-blue-400"
                            style={{ width: `${Math.min(catPct ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className="w-24 text-right text-xs font-medium text-gray-700">
                          {fmtCOP(cat.spent)}
                        </span>
                        {catPct !== null && (
                          <span className="w-10 text-right text-[10px] text-gray-400">
                            {catPct}%
                          </span>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="text-[10px] text-gray-400">Gastado</p>
              <p className="mt-1 text-lg font-bold text-gray-800">{fmtCOP(b?.total_spent ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="text-[10px] text-gray-400">Pendiente</p>
              <p className="mt-1 text-lg font-bold text-yellow-600">
                {fmtCOP(b?.total_pending ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="text-[10px] text-gray-400">Disponible</p>
              <p
                className={`mt-1 text-lg font-bold ${(b?.remaining ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}
              >
                {fmtCOP(Math.abs(b?.remaining ?? 0))}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
