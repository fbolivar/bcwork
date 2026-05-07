'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Gauge, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const LOAD_CONFIG = {
  high: { label: 'Alta carga', bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
  medium: {
    label: 'Carga normal',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    bar: 'bg-yellow-400',
  },
  low: { label: 'Baja actividad', bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-400' },
}

export function WorkloadDistributionPanel() {
  const [days, setDays] = useState(7)

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id

  const { data: rows, isLoading } = trpc.manager.getWorkloadDistribution.useQuery({ teamId, days })
  const employees = (rows ?? []) as any[]

  const sorted = [...employees].sort((a, b) => b.avg_daily_hours - a.avg_daily_hours)
  const avgHours =
    employees.length > 0
      ? employees.reduce((s, e) => s + e.avg_daily_hours, 0) / employees.length
      : 0
  const highCount = employees.filter((e) => e.load_level === 'high').length
  const lowCount = employees.filter((e) => e.load_level === 'low').length
  const maxHours = Math.max(...employees.map((e) => e.avg_daily_hours), 1)

  function indicator(val: number, avg: number) {
    const diff = val - avg
    if (Math.abs(diff) < avg * 0.1) return <Minus className="h-3.5 w-3.5 text-gray-400" />
    if (diff > 0) return <TrendingUp className="h-3.5 w-3.5 text-red-400" />
    return <TrendingDown className="h-3.5 w-3.5 text-green-500" />
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Distribución de carga</h2>
        <p className="mt-0.5 text-sm text-gray-500">Actividad y nivel de carga por empleado</p>
      </div>

      <div className="flex gap-1.5">
        {([7, 14, 30] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${days === d ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {d}d
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Gauge className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Sin datos para el período</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
              <p className="text-[10px] text-gray-400">Horas diarias promedio</p>
              <p className="mt-1 text-xl font-bold text-gray-800">{avgHours.toFixed(1)}h</p>
            </div>
            <div className="rounded-xl border border-red-50 bg-red-50 p-3 text-center">
              <p className="text-[10px] text-red-400">Alta carga</p>
              <p className="mt-1 text-xl font-bold text-red-600">{highCount}</p>
            </div>
            <div className="rounded-xl border border-blue-50 bg-blue-50 p-3 text-center">
              <p className="text-[10px] text-blue-400">Baja actividad</p>
              <p className="mt-1 text-xl font-bold text-blue-600">{lowCount}</p>
            </div>
          </div>

          {/* Bars */}
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <div className="divide-y divide-gray-50">
              {sorted.map((e) => {
                const cfg =
                  LOAD_CONFIG[e.load_level as keyof typeof LOAD_CONFIG] ?? LOAD_CONFIG.medium
                const barPct = (e.avg_daily_hours / maxHours) * 100
                return (
                  <div key={e.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {(e.full_name ?? e.email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-800">
                            {e.full_name ?? e.email}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {indicator(e.avg_daily_hours, avgHours)}
                            <span className="text-sm font-medium text-gray-700">
                              {e.avg_daily_hours}h/día
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                          <div
                            className={`h-2 rounded-full ${cfg.bar}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-400">
                          <span
                            className={`rounded-full px-1.5 py-0.5 font-medium ${cfg.bg} ${cfg.text}`}
                          >
                            {cfg.label}
                          </span>
                          <span>{e.avg_productivity}% productividad</span>
                          <span>{e.active_goals} objetivos activos</span>
                          <span>{e.days_active} días activo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            Alta carga &gt; 9h/día · Normal 6–9h · Baja actividad &lt; 6h
          </p>
        </>
      )}
    </div>
  )
}
