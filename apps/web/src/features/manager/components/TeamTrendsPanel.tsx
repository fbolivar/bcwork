'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { TrendingUp } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  })
}

type ChartMode = 'productivity' | 'hours' | 'overtime'

export function TeamTrendsPanel() {
  const [days, setDays] = useState(30)
  const [mode, setMode] = useState<ChartMode>('productivity')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id

  const { data: trends, isLoading } = trpc.manager.getTeamTrends.useQuery(
    { teamId, days },
    { enabled: true },
  )

  const allPoints = (trends ?? []) as any[]

  // Compute chart values
  const values = allPoints.map((p: any) => {
    if (mode === 'productivity') return Math.round(p.avg_productivity_ratio * 100)
    if (mode === 'hours') return Math.round(p.avg_active_seconds / 3600)
    return Math.round(p.total_overtime_seconds / 3600)
  })

  const maxVal = Math.max(...values, 1)
  const avgVal =
    values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0

  const modeConfig: Record<ChartMode, { label: string; color: string; unit: string }> = {
    productivity: { label: 'Productividad promedio', color: '#2563eb', unit: '%' },
    hours: { label: 'Horas activas promedio', color: '#16a34a', unit: 'h' },
    overtime: { label: 'Horas extra totales', color: '#ea580c', unit: 'h' },
  }

  const cfg = modeConfig[mode]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Tendencias del equipo</h2>
        <p className="mt-0.5 text-sm text-gray-500">Evolución histórica de métricas clave</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1.5">
          {([7, 14, 30, 60, 90] as const).map((d) => (
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
        <div className="flex gap-1.5">
          {(['productivity', 'hours', 'overtime'] as ChartMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === m
                  ? 'bg-gray-800 text-white'
                  : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {{ productivity: 'Productividad', hours: 'Horas', overtime: 'Extra' }[m]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      ) : allPoints.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <TrendingUp className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay datos para el período seleccionado</p>
        </div>
      ) : (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="text-xs text-gray-500">Promedio período</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                {avgVal}
                <span className="text-sm font-normal text-gray-400">{cfg.unit}</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="text-xs text-gray-500">Máximo</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                {maxVal}
                <span className="text-sm font-normal text-gray-400">{cfg.unit}</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="text-xs text-gray-500">Días con datos</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{allPoints.length}</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="mb-4 text-xs font-medium text-gray-500">{cfg.label}</p>
            <div className="flex h-48 items-end gap-0.5 overflow-x-auto">
              {allPoints.map((p: any, i: number) => {
                const val = values[i] ?? 0
                const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
                const isLow = mode === 'productivity' && val < 40
                const isMid = mode === 'productivity' && val >= 40 && val < 70
                const barColor = isLow ? '#ef4444' : isMid ? '#ca8a04' : cfg.color
                return (
                  <div
                    key={p.date}
                    className="group relative flex min-w-[8px] flex-1 flex-col items-center justify-end"
                  >
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${Math.max(pct, 2)}%`,
                        backgroundColor: barColor,
                        opacity: 0.85,
                      }}
                    />
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-gray-800 px-2 py-1 text-[10px] text-white group-hover:block">
                      {fmtDate(p.date)}: {val}
                      {cfg.unit}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-gray-400">
              <span>{allPoints[0] ? fmtDate(allPoints[0].date) : ''}</span>
              <span>
                {allPoints[allPoints.length - 1]
                  ? fmtDate(allPoints[allPoints.length - 1].date)
                  : ''}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2.5 text-right font-medium">Productividad</th>
                  <th className="px-4 py-2.5 text-right font-medium">Horas activas</th>
                  <th className="px-4 py-2.5 text-right font-medium">Horas extra</th>
                  <th className="px-4 py-2.5 text-right font-medium">Usuarios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {[...allPoints].reverse().map((p: any) => (
                  <tr key={p.date} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">{fmtDate(p.date)}</td>
                    <td
                      className={`px-4 py-2 text-right font-medium ${
                        p.avg_productivity_ratio >= 0.7
                          ? 'text-green-600'
                          : p.avg_productivity_ratio >= 0.4
                            ? 'text-yellow-600'
                            : 'text-red-500'
                      }`}
                    >
                      {Math.round(p.avg_productivity_ratio * 100)}%
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {fmtHours(p.avg_active_seconds)}
                    </td>
                    <td className="px-4 py-2 text-right text-orange-500">
                      {p.total_overtime_seconds > 60 ? fmtHours(p.total_overtime_seconds) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">{p.active_users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
