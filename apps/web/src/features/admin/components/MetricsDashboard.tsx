'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Download, Printer } from 'lucide-react'
import { TrendChart } from './charts/TrendChart'
import { BarChart } from './charts/BarChart'
import { TopUsersTable } from './TopUsersTable'
import { ReportHeader, ReportFooter } from '@/features/shared/components/ReportHeader'

type Period = 7 | 14 | 30 | 90

const PERIOD_LABELS: Record<Period, string> = {
  7: '7 días',
  14: '14 días',
  30: '30 días',
  90: '90 días',
}

function fmtHours(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

export function MetricsDashboard() {
  const [period, setPeriod] = useState<Period>(14)
  const [refreshing, setRefreshing] = useState(false)

  const settings = trpc.admin.getSettings.useQuery()
  const trend = trpc.admin.getProductivityTrend.useQuery({ days: period })
  const topUsers = trpc.admin.getTopUsers.useQuery({
    days: period,
    metric: 'productivity_ratio',
    limit: 10,
  })
  const topDomains = trpc.admin.getTopDomains.useQuery({ days: period })
  const trigger = trpc.admin.triggerAggregation.useMutation({
    onSuccess: () => {
      void trend.refetch()
      void topUsers.refetch()
      void topDomains.refetch()
      setRefreshing(false)
    },
    onError: () => setRefreshing(false),
  })

  const trendData = trend.data ?? []

  // KPIs del período
  const totalActive = trendData.reduce((s, d) => s + d.active_seconds, 0)
  const totalProductive = trendData.reduce((s, d) => s + d.productive_seconds, 0)
  const avgRatio =
    trendData.length > 0
      ? trendData.reduce((s, d) => s + d.productivity_ratio, 0) / trendData.length
      : 0
  const totalOvertime = trendData.reduce((s, d) => s + d.overtime_seconds, 0)

  const companyName = settings.data?.trade_name ?? settings.data?.legal_name ?? 'Mi empresa'

  return (
    <div className="space-y-6">
      {/* Header visible solo en impresión */}
      <div className="hidden print:block">
        <ReportHeader
          logoUrl={settings.data?.logo_url}
          companyName={companyName}
          nit={settings.data?.nit}
          title="Reporte de Métricas y Productividad"
          period={`Últimos ${PERIOD_LABELS[period]}`}
        />
      </div>

      {/* Controles — ocultos en impresión */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {([7, 14, 30, 90] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/reports/metrics?days=${period}`}
            download
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            Exportar PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true)
              trigger.mutate({})
            }}
            disabled={refreshing}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {refreshing ? 'Calculando...' : 'Recalcular métricas'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Tiempo activo total"
          value={fmtHours(totalActive)}
          sub={`${period} días`}
          color="blue"
        />
        <KpiCard
          label="Tiempo productivo"
          value={fmtHours(totalProductive)}
          sub={`${pct(avgRatio)} promedio`}
          color="green"
        />
        <KpiCard
          label="Productividad promedio"
          value={pct(avgRatio)}
          sub="ratio activo/productivo"
          color={avgRatio >= 0.6 ? 'green' : avgRatio >= 0.4 ? 'yellow' : 'red'}
        />
        <KpiCard
          label="Horas extra acumuladas"
          value={fmtHours(totalOvertime)}
          sub="sobre horario asignado"
          color={totalOvertime > 3600 * 5 ? 'red' : 'gray'}
        />
      </div>

      {/* Gráfica de tendencia */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Tendencia de productividad</h3>
        {trend.isLoading ? (
          <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
        ) : trendData.length === 0 ? (
          <EmptyMetrics />
        ) : (
          <TrendChart data={trendData} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top dominios */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Dominios más visitados</h3>
          {topDomains.isLoading ? (
            <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
          ) : (topDomains.data ?? []).length === 0 ? (
            <EmptyMetrics />
          ) : (
            <BarChart
              data={(topDomains.data ?? []).slice(0, 10).map((d) => ({
                label: d.domain,
                value: d.secs,
                formatted: fmtHours(d.secs),
              }))}
            />
          )}
        </div>

        {/* Top usuarios */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Usuarios más activos</h3>
          {topUsers.isLoading ? (
            <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <TopUsersTable users={topUsers.data ?? []} />
          )}
        </div>
      </div>

      {/* Footer visible solo en impresión */}
      <div className="hidden print:block">
        <ReportFooter companyName={companyName} />
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
}) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    gray: 'text-gray-600 bg-gray-50',
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs opacity-60">{sub}</p>
    </div>
  )
}

function EmptyMetrics() {
  return (
    <div className="flex h-32 flex-col items-center justify-center text-center">
      <p className="text-sm text-gray-400">Sin datos para el período</p>
      <p className="mt-1 text-xs text-gray-300">
        Los datos aparecen tras la primera agregación nocturna
      </p>
    </div>
  )
}
