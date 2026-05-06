'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { TrendChart } from '@/features/admin/components/charts/TrendChart'
import { BarChart } from '@/features/admin/components/charts/BarChart'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

type Period = 7 | 14 | 30

export default function MyMetricsPage() {
  const [days, setDays] = useState<Period>(14)
  const { data, isLoading } = trpc.employee.getMyMetrics.useQuery({ days })

  const series = (data?.series ?? []).map((r) => ({
    date: r.metric_date ?? '',
    active_seconds: r.active_seconds ?? 0,
    productive_seconds: r.productive_seconds ?? 0,
    non_productive_seconds: r.non_productive_seconds ?? 0,
    productivity_ratio: r.productivity_ratio,
    overtime_seconds: r.overtime_seconds ?? 0,
    user_count: 1,
  }))

  const summary = data?.summary

  // Top dominios de todos los días
  const domainMap = new Map<string, number>()
  for (const row of data?.series ?? []) {
    const domains = row.domains_top as Array<{ domain: string; secs: number }> | null
    for (const d of domains ?? []) {
      domainMap.set(d.domain, (domainMap.get(d.domain) ?? 0) + d.secs)
    }
  }
  const topDomains = Array.from(domainMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([domain, secs]) => ({ label: domain, value: secs, formatted: fmtHours(secs) }))

  const { data: monthData } = trpc.employee.getMyMetrics.useQuery({ days: 30 })
  const monthOvertime = monthData?.summary.total_overtime_seconds ?? 0
  const LEGAL_LIMIT_SECS = 50 * 3600 // 50 horas extra al mes — Ley 2121
  const overtimePct =
    LEGAL_LIMIT_SECS > 0 ? Math.min(100, Math.round((monthOvertime / LEGAL_LIMIT_SECS) * 100)) : 0

  return (
    <div className="space-y-6">
      {/* Horas extras del mes */}
      <div
        className={`rounded-2xl p-5 ${monthOvertime > LEGAL_LIMIT_SECS ? 'border border-red-200 bg-red-50' : monthOvertime > LEGAL_LIMIT_SECS * 0.8 ? 'border border-yellow-200 bg-yellow-50' : 'border border-gray-200 bg-white'}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Horas extras — mes actual
            </p>
            <p
              className={`mt-1 text-3xl font-bold tabular-nums ${monthOvertime > LEGAL_LIMIT_SECS ? 'text-red-600' : 'text-gray-900'}`}
            >
              {fmtHours(monthOvertime)}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              de {fmtHours(LEGAL_LIMIT_SECS)} límite legal mensual (Ley 2121/2021)
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold tabular-nums ${overtimePct >= 100 ? 'text-red-600' : overtimePct >= 80 ? 'text-yellow-600' : 'text-green-600'}`}
            >
              {overtimePct}%
            </p>
            <p className="text-xs text-gray-400">del límite</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${overtimePct >= 100 ? 'bg-red-500' : overtimePct >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${overtimePct}%` }}
          />
        </div>
        {monthOvertime > LEGAL_LIMIT_SECS && (
          <p className="mt-2 text-xs font-medium text-red-700">
            ⚠ Superaste el límite legal. Tienes derecho a compensación o descanso. Consulta con tu
            empleador.
          </p>
        )}
        {monthOvertime > LEGAL_LIMIT_SECS * 0.8 && monthOvertime <= LEGAL_LIMIT_SECS && (
          <p className="mt-2 text-xs text-yellow-700">
            Estás cerca del límite mensual de horas extra permitidas por la ley.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mi rendimiento</h1>
          <p className="mt-1 text-sm text-gray-500">Tu productividad histórica</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {([7, 14, 30] as Period[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                days === d ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: 'Tiempo activo',
              value: fmtHours(summary.total_active_seconds),
              color: 'bg-blue-50 text-blue-600',
            },
            {
              label: 'Tiempo productivo',
              value: fmtHours(summary.total_productive_seconds),
              color: 'bg-green-50 text-green-600',
            },
            {
              label: 'Productividad',
              value: `${Math.round(summary.avg_productivity_ratio * 100)}%`,
              color: 'bg-purple-50 text-purple-600',
            },
            {
              label: 'Días activos',
              value: `${summary.days_with_activity}`,
              color: 'bg-gray-50 text-gray-600',
            },
          ].map((k) => (
            <div key={k.label} className={`rounded-xl p-4 ${k.color}`}>
              <p className="text-xs font-medium opacity-70">{k.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Gráfica */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Tendencia de actividad</h3>
        {isLoading ? (
          <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
        ) : series.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Sin datos para el período</p>
        ) : (
          <TrendChart data={series} />
        )}
      </div>

      {/* Dominios */}
      {topDomains.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Sitios web más visitados</h3>
          <BarChart data={topDomains} />
        </div>
      )}

      {/* Aviso overtime */}
      {summary && summary.total_overtime_seconds > 3600 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <strong>Atención:</strong> acumulaste {fmtHours(summary.total_overtime_seconds)} de horas
          extra en los últimos {days} días. La Ley 2191/2022 protege tu derecho a la desconexión.
        </div>
      )}
    </div>
  )
}
