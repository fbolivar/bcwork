'use client'

import { trpc } from '@/lib/trpc-client'
import { DollarSign, TrendingUp } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  salary_increase: 'Aumento salarial',
  bonus: 'Bono',
  promotion: 'Promoción',
  adjustment: 'Ajuste',
  initial: 'Salario inicial',
}

function fmtCOP(n: number | null) {
  if (!n) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

function pctChange(current: number, previous: number) {
  if (!previous) return null
  return (((current - previous) / previous) * 100).toFixed(1)
}

export function MyCompensationPanel() {
  const { data, isLoading } = trpc.employee.getMyCompensationHistory.useQuery()
  const records = (data ?? []) as any[]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Mi historial de compensación</h2>
        <p className="mt-0.5 text-sm text-gray-500">Evolución salarial y cambios de compensación</p>
      </div>

      {/* Current salary highlight */}
      {records.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-xs text-blue-500">Compensación actual</p>
          <p className="mt-1 text-3xl font-bold text-blue-700">{fmtCOP(records[0]?.salary)}</p>
          <p className="mt-0.5 text-xs text-blue-400">
            {records[0]?.currency ?? 'COP'} ·{' '}
            {TYPE_LABELS[records[0]?.compensation_type] ?? records[0]?.compensation_type ?? ''}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <DollarSign className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Sin historial de compensación registrado</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Fecha efectiva</th>
                <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
                <th className="px-4 py-2.5 text-right font-medium">Salario</th>
                <th className="px-4 py-2.5 text-right font-medium">Cambio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {records.map((r: any, i: number) => {
                const prev = records[i + 1]
                const pct = prev ? pctChange(r.salary, prev.salary) : null
                const isUp = pct !== null && parseFloat(pct) > 0
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(r.effective_date).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {TYPE_LABELS[r.compensation_type] ?? r.compensation_type ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {fmtCOP(r.salary)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pct !== null ? (
                        <span
                          className={`flex items-center justify-end gap-1 text-xs font-medium ${isUp ? 'text-green-600' : 'text-red-500'}`}
                        >
                          <TrendingUp className={`h-3 w-3 ${isUp ? '' : 'rotate-180'}`} />
                          {isUp ? '+' : ''}
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        Solo visible para ti. Actualizado por Recursos Humanos.
      </p>
    </div>
  )
}
