'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Users2, ArrowUp, ArrowDown, Minus } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

type SortKey =
  | 'avg_productivity_ratio'
  | 'total_active_seconds'
  | 'total_overtime_seconds'
  | 'avg_focus_score'
  | 'days_active'

export function TeamComparisonPanel() {
  const [days, setDays] = useState(30)
  const [sortKey, setSortKey] = useState<SortKey>('avg_productivity_ratio')
  const [sortAsc, setSortAsc] = useState(false)

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id

  const { data: comparison, isLoading } = trpc.manager.getTeamComparison.useQuery(
    { teamId, days },
    { enabled: true },
  )

  const rows = ([...(comparison ?? [])] as any[]).sort((a, b) => {
    const va = a[sortKey] ?? 0
    const vb = b[sortKey] ?? 0
    return sortAsc ? va - vb : vb - va
  })

  if (rows.length === 0) return null

  // Compute team averages for benchmarking
  const avgProd = rows.reduce((s, r) => s + r.avg_productivity_ratio, 0) / rows.length
  const avgActive = rows.reduce((s, r) => s + r.total_active_seconds, 0) / rows.length
  const avgOvertime = rows.reduce((s, r) => s + r.total_overtime_seconds, 0) / rows.length

  function indicator(value: number, avg: number, higherIsBetter = true) {
    const diff = value - avg
    if (Math.abs(diff) < avg * 0.05) return <Minus className="h-3.5 w-3.5 text-gray-400" />
    if (diff > 0 === higherIsBetter) return <ArrowUp className="h-3.5 w-3.5 text-green-500" />
    return <ArrowDown className="h-3.5 w-3.5 text-red-400" />
  }

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    return (
      <button
        type="button"
        onClick={() => {
          if (sortKey === k) setSortAsc((v) => !v)
          else {
            setSortKey(k)
            setSortAsc(false)
          }
        }}
        className={`flex items-center gap-1 px-4 py-2.5 text-right text-xs font-medium ${sortKey === k ? 'text-blue-600' : 'text-gray-500'}`}
      >
        {label}
        {sortKey === k && (sortAsc ? ' ↑' : ' ↓')}
      </button>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Comparativa del equipo</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Métricas lado a lado para identificar outliers
        </p>
      </div>

      <div className="flex gap-1.5">
        {([7, 14, 30, 60] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              days === d
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Users2 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Sin datos para el período</p>
        </div>
      ) : (
        <>
          {/* Team averages banner */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="text-xs text-gray-400">Productividad media</p>
              <p className="mt-1 text-xl font-bold text-blue-600">{Math.round(avgProd * 100)}%</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="text-xs text-gray-400">Horas activas media</p>
              <p className="mt-1 text-xl font-bold text-green-600">
                {fmtHours(Math.round(avgActive))}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="text-xs text-gray-400">Horas extra media</p>
              <p className="mt-1 text-xl font-bold text-orange-500">
                {fmtHours(Math.round(avgOvertime))}
              </p>
            </div>
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                    Empleado
                  </th>
                  <th className="text-right">
                    <SortBtn k="days_active" label="Días" />
                  </th>
                  <th className="text-right">
                    <SortBtn k="total_active_seconds" label="Horas activas" />
                  </th>
                  <th className="text-right">
                    <SortBtn k="avg_productivity_ratio" label="Productividad" />
                  </th>
                  <th className="text-right">
                    <SortBtn k="avg_focus_score" label="Foco" />
                  </th>
                  <th className="text-right">
                    <SortBtn k="total_overtime_seconds" label="Horas extra" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {rows.map((r: any, i: number) => (
                  <tr key={r.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400">#{i + 1}</span>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {(r.full_name ?? r.email ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{r.full_name ?? r.email}</p>
                          {r.department && (
                            <p className="text-[10px] text-gray-400">{r.department}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.days_active}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {indicator(r.total_active_seconds, avgActive)}
                        <span className="font-medium text-gray-700">
                          {fmtHours(r.total_active_seconds)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {indicator(r.avg_productivity_ratio, avgProd)}
                        <span
                          className={`font-medium ${
                            r.avg_productivity_ratio >= 0.7
                              ? 'text-green-600'
                              : r.avg_productivity_ratio >= 0.4
                                ? 'text-yellow-600'
                                : 'text-red-500'
                          }`}
                        >
                          {Math.round(r.avg_productivity_ratio * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {indicator(
                          r.avg_focus_score,
                          rows.reduce((s: number, x: any) => s + x.avg_focus_score, 0) /
                            rows.length,
                        )}
                        <span className="text-gray-600">
                          {r.avg_focus_score > 0 ? `${Math.round(r.avg_focus_score * 100)}%` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {indicator(r.total_overtime_seconds, avgOvertime, false)}
                        <span
                          className={
                            r.total_overtime_seconds > 0 ? 'text-orange-500' : 'text-gray-400'
                          }
                        >
                          {r.total_overtime_seconds > 60 ? fmtHours(r.total_overtime_seconds) : '—'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-gray-400">
            ↑ sobre el promedio del equipo · ↓ bajo el promedio · — dentro del ±5%
          </p>
        </>
      )}
    </div>
  )
}
