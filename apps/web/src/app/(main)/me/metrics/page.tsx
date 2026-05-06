'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { TrendChart } from '@/features/admin/components/charts/TrendChart'
import { BarChart } from '@/features/admin/components/charts/BarChart'
import { HelpCircle, BarChart3 } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative ml-1 inline-flex items-center">
      <button
        type="button"
        title="Más información"
        className="text-gray-300 hover:text-gray-500"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        tabIndex={0}
      >
        <HelpCircle className="h-3 w-3" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-center text-xs leading-snug text-white shadow-xl">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  )
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null
  const up = delta > 0
  const neutral = delta === 0
  const cls = neutral ? 'text-gray-400' : up ? 'text-green-600' : 'text-red-500'
  const arrow = neutral ? '→' : up ? '↑' : '↓'
  return (
    <span className={`ml-1 text-[10px] font-semibold tabular-nums ${cls}`}>
      {arrow}
      {Math.abs(delta)}%
    </span>
  )
}

function heatColor(secs: number): string {
  if (secs === 0) return 'bg-gray-100'
  if (secs < 7200) return 'bg-blue-100'
  if (secs < 14400) return 'bg-blue-300'
  return 'bg-blue-500'
}

const MONTH_ABBR = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]
const DOW_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function ActivityHeatmap({
  series,
}: {
  series: Array<{ metric_date: string | null; active_seconds: number | null }>
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = today.getDay()

  const thisSunday = new Date(today)
  thisSunday.setDate(today.getDate() - dow)

  const startDate = new Date(thisSunday)
  startDate.setDate(thisSunday.getDate() - 11 * 7)

  const byDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of series) {
      if (r.metric_date) m.set(r.metric_date, r.active_seconds ?? 0)
    }
    return m
  }, [series])

  const weeks = useMemo(() => {
    const w: Array<Array<{ date: string; secs: number; isToday: boolean; isFuture: boolean }>> = []
    for (let wi = 0; wi < 12; wi++) {
      const week: (typeof w)[number] = []
      for (let d = 0; d < 7; d++) {
        const dt = new Date(startDate)
        dt.setDate(startDate.getDate() + wi * 7 + d)
        const dateStr = dt.toISOString().slice(0, 10)
        const todayStr = today.toISOString().slice(0, 10)
        week.push({
          date: dateStr,
          secs: byDate.get(dateStr) ?? 0,
          isToday: dateStr === todayStr,
          isFuture: dt > today,
        })
      }
      w.push(week)
    }
    return w
  }, [byDate, startDate, today])

  const monthLabels = weeks.map((week) => {
    const firstDay = new Date(week[0]!.date)
    if (firstDay.getDate() <= 7) return MONTH_ABBR[firstDay.getMonth()] ?? ''
    return ''
  })

  return (
    <div>
      <div className="flex gap-1">
        <div className="flex w-7 shrink-0 flex-col gap-1 pt-5">
          {DOW_ABBR.map((d) => (
            <div key={d} className="flex h-4 items-center text-right text-[10px] text-gray-400">
              {d}
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex gap-1">
            {weeks.map((_, wi) => (
              <div key={wi} className="flex h-4 w-4 shrink-0 items-end">
                <span className="text-[10px] leading-none text-gray-400">{monthLabels[wi]}</span>
              </div>
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, di) => (
            <div key={di} className="flex gap-1">
              {weeks.map((week, wi) => {
                const cell = week[di]!
                return (
                  <div
                    key={wi}
                    title={`${cell.date}: ${cell.secs > 0 ? fmtHours(cell.secs) : 'sin actividad'}`}
                    className={`h-4 w-4 shrink-0 rounded-sm ${
                      cell.isFuture
                        ? 'bg-gray-50'
                        : cell.isToday
                          ? 'ring-2 ring-blue-500 ring-offset-1 ' + heatColor(cell.secs)
                          : heatColor(cell.secs)
                    }`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-gray-400">Menos</span>
        {['bg-gray-100', 'bg-blue-100', 'bg-blue-300', 'bg-blue-500'].map((c) => (
          <div key={c} className={`h-3 w-3 rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-gray-400">Más</span>
      </div>
    </div>
  )
}

type Period = 7 | 14 | 30

type RawRow = {
  metric_date: string | null
  active_seconds: number | null
  productive_seconds: number | null
  non_productive_seconds: number | null
  productivity_ratio: number
  overtime_seconds: number | null
}

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((curr - prev) / prev) * 100)
}

export default function MyMetricsPage() {
  const [days, setDays] = useState<Period>(14)
  const { data, isLoading } = trpc.employee.getMyMetrics.useQuery({ days })
  const { data: heatData } = trpc.employee.getMyMetrics.useQuery({ days: 84 })
  const { data: prevPeriodData } = trpc.employee.getMyMetrics.useQuery({
    days: (days * 2) as 14 | 28 | 60,
  })

  const series = ((data?.series ?? []) as RawRow[]).map((r) => ({
    date: r.metric_date ?? '',
    active_seconds: r.active_seconds ?? 0,
    productive_seconds: r.productive_seconds ?? 0,
    non_productive_seconds: r.non_productive_seconds ?? 0,
    productivity_ratio: r.productivity_ratio,
    overtime_seconds: r.overtime_seconds ?? 0,
    user_count: 1,
  }))

  const summary = data?.summary

  const prevSummary = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const prevRows = ((prevPeriodData?.series ?? []) as RawRow[]).filter(
      (r) => r.metric_date != null && r.metric_date < cutoffStr,
    )
    if (prevRows.length === 0) return null
    return {
      total_active_seconds: prevRows.reduce((s, r) => s + (r.active_seconds ?? 0), 0),
      total_productive_seconds: prevRows.reduce((s, r) => s + (r.productive_seconds ?? 0), 0),
      avg_productivity_ratio:
        prevRows.reduce((s, r) => s + r.productivity_ratio, 0) / prevRows.length,
      days_with_activity: prevRows.filter((r) => (r.active_seconds ?? 0) > 0).length,
    }
  }, [prevPeriodData, days])

  type DomainRow = { domains_top: unknown }
  const domainMap = new Map<string, number>()
  for (const row of (data?.series ?? []) as DomainRow[]) {
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
  const LEGAL_LIMIT_SECS = 50 * 3600
  const overtimePct =
    LEGAL_LIMIT_SECS > 0 ? Math.min(100, Math.round((monthOvertime / LEGAL_LIMIT_SECS) * 100)) : 0

  const kpis = [
    {
      label: 'Tiempo activo',
      value: fmtHours(summary?.total_active_seconds ?? 0),
      color: 'bg-blue-50 text-blue-600',
      tip: 'Total de tiempo que el agente detectó actividad en tu computador durante el período.',
      delta: prevSummary
        ? pctDelta(summary?.total_active_seconds ?? 0, prevSummary.total_active_seconds)
        : null,
    },
    {
      label: 'Tiempo productivo',
      value: fmtHours(summary?.total_productive_seconds ?? 0),
      color: 'bg-green-50 text-green-600',
      tip: 'Tiempo dedicado a apps y sitios clasificados como productivos por tu empresa.',
      delta: prevSummary
        ? pctDelta(summary?.total_productive_seconds ?? 0, prevSummary.total_productive_seconds)
        : null,
    },
    {
      label: 'Productividad',
      value: `${Math.round((summary?.avg_productivity_ratio ?? 0) * 100)}%`,
      color: 'bg-purple-50 text-purple-600',
      tip: 'Ratio de tiempo productivo sobre tiempo activo total. Promedio diario del período.',
      delta: prevSummary
        ? pctDelta(
            Math.round((summary?.avg_productivity_ratio ?? 0) * 100),
            Math.round(prevSummary.avg_productivity_ratio * 100),
          )
        : null,
    },
    {
      label: 'Días activos',
      value: `${summary?.days_with_activity ?? 0}`,
      color: 'bg-gray-50 text-gray-600',
      tip: 'Días en que el agente registró al menos una sesión de trabajo.',
      delta: prevSummary
        ? pctDelta(summary?.days_with_activity ?? 0, prevSummary.days_with_activity)
        : null,
    },
  ]

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
        <div className="mt-3 flex h-2 gap-px overflow-hidden rounded-full">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 ${
                i < Math.round(overtimePct / 5)
                  ? overtimePct >= 100
                    ? 'bg-red-500'
                    : overtimePct >= 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  : 'bg-gray-200'
              }`}
            />
          ))}
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
          <p className="mt-1 text-sm text-gray-500">
            Tu productividad histórica
            {prevSummary && (
              <span className="ml-2 text-xs text-gray-400">· comparado con período anterior</span>
            )}
          </p>
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

      {/* Empty state global */}
      {!isLoading && !summary && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 px-6 py-20 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-5">
            <BarChart3 className="h-10 w-10 text-gray-300" />
          </div>
          <p className="text-base font-semibold text-gray-600">Sin datos de rendimiento</p>
          <p className="mt-2 max-w-sm text-sm text-gray-400">
            El agente BCWork registrará automáticamente tu actividad laboral. Asegúrate de que esté
            instalado y activo en tu computador.
          </p>
          <Link
            href="/me/privacy"
            className="mt-5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Ver mi configuración de privacidad
          </Link>
        </div>
      )}

      {/* KPIs con tooltips y comparativa */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className={`rounded-xl p-4 ${k.color}`}>
              <div className="flex items-center text-xs font-medium opacity-70">
                {k.label}
                <InfoTooltip text={k.tip} />
                <DeltaBadge delta={k.delta} />
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap de actividad */}
      {heatData && heatData.series.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Actividad — últimas 12 semanas
          </h3>
          <ActivityHeatmap
            series={
              heatData.series as Array<{
                metric_date: string | null
                active_seconds: number | null
              }>
            }
          />
        </div>
      )}

      {/* Gráfica de tendencia */}
      {summary && (
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
      )}

      {/* Dominios */}
      {topDomains.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Sitios web más visitados</h3>
          <BarChart data={topDomains} />
        </div>
      )}

      {summary && summary.total_overtime_seconds > 3600 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <strong>Atención:</strong> acumulaste {fmtHours(summary.total_overtime_seconds)} de horas
          extra en los últimos {days} días. La Ley 2191/2022 protege tu derecho a la desconexión.
        </div>
      )}
    </div>
  )
}
