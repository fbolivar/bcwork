'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Download, Printer, RefreshCw } from 'lucide-react'
import { TopUsersTable } from './TopUsersTable'
import { ReportHeader, ReportFooter } from '@/features/shared/components/ReportHeader'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHours(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
  })
}

const CATEGORY_LABELS: Record<string, string> = {
  communication: 'Comunicación',
  development: 'Desarrollo',
  browsing: 'Navegación',
  entertainment: 'Entretenimiento',
  productivity: 'Productividad',
  other: 'Otros',
}

const CATEGORY_COLORS: Record<string, string> = {
  communication: '#3b82f6',
  development: '#8b5cf6',
  browsing: '#06b6d4',
  entertainment: '#f59e0b',
  productivity: '#22c55e',
  other: '#94a3b8',
}

type Period = 7 | 14 | 30

const PERIOD_LABELS: Record<Period, string> = { 7: '7 días', 14: '14 días', 30: '30 días' }

// ── Donut Chart ───────────────────────────────────────────────────────────────

function DonutChart({ data }: { data: { category: string; pct: number; secs: number }[] }) {
  const r = 56
  const cx = 80
  const cy = 80
  const strokeW = 22
  const C = 2 * Math.PI * r

  let accumulated = 0
  const segments = data.slice(0, 6).map((item) => {
    const seg = { ...item, accumulated }
    accumulated += item.pct / 100
    return seg
  })

  const totalSecs = data.reduce((s, d) => s + d.secs, 0)

  return (
    <div className="flex items-center gap-5">
      <svg width="160" height="160" viewBox="0 0 160 160" className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
        {segments.length === 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeW} />
        )}
        {segments.map((seg) => (
          <circle
            key={seg.category}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={CATEGORY_COLORS[seg.category] ?? '#94a3b8'}
            strokeWidth={strokeW}
            strokeDasharray={`${(seg.pct / 100) * C} ${C}`}
            strokeDashoffset={`-${seg.accumulated * C}`}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        <text
          x={cx}
          y={cy - 7}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="15"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          {fmtHours(totalSecs)}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="10"
          fontFamily="sans-serif"
        >
          registrado
        </text>
      </svg>
      <div className="flex flex-1 flex-col gap-2">
        {segments.map((seg) => (
          <div key={seg.category} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
              style={{ background: CATEGORY_COLORS[seg.category] ?? '#94a3b8' }}
            />
            <span className="flex-1 text-xs text-gray-600">
              {CATEGORY_LABELS[seg.category] ?? seg.category}
            </span>
            <span className="text-xs font-semibold text-gray-800">{seg.pct}%</span>
          </div>
        ))}
        {segments.length === 0 && <p className="text-xs text-gray-400">Sin datos de apps</p>}
      </div>
    </div>
  )
}

// ── Stacked Bar Chart ─────────────────────────────────────────────────────────

interface WorkloadDay {
  date: string
  productive_hours: number
  neutral_hours: number
  non_productive_hours: number
}

function StackedBars({ data }: { data: WorkloadDay[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Sin datos del período</p>
  }

  const maxH = Math.max(
    ...data.map((d) => d.productive_hours + d.neutral_hours + d.non_productive_hours),
    1,
  )
  const BAR_H = 140

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: BAR_H + 28 }}>
        {data.map((d) => {
          const pH = Math.round((d.productive_hours / maxH) * BAR_H)
          const nH = Math.round((d.neutral_hours / maxH) * BAR_H)
          const npH = Math.round((d.non_productive_hours / maxH) * BAR_H)
          return (
            <div
              key={d.date}
              className="flex flex-1 flex-col items-center"
              style={{ minWidth: 32 }}
            >
              <div className="flex w-full flex-col-reverse" style={{ height: BAR_H }}>
                <div
                  style={{ height: pH, background: '#4ade80', borderRadius: '0 0 3px 3px' }}
                  title={`${d.productive_hours}h productivo`}
                />
                <div
                  style={{ height: nH, background: '#fbbf24' }}
                  title={`${d.neutral_hours}h neutral`}
                />
                <div
                  style={{ height: npH, background: '#f87171', borderRadius: '3px 3px 0 0' }}
                  title={`${d.non_productive_hours}h no productivo`}
                />
              </div>
              <span className="mt-1 w-full text-center text-xs leading-tight text-gray-400">
                {fmtDate(d.date)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-green-400" /> Productivo
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-yellow-400" /> Neutral
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-red-400" /> No productivo
        </span>
      </div>
    </div>
  )
}

// ── Productivity Gauge (semicircle) ───────────────────────────────────────────

function ProductivityGauge({ value, goal = 70 }: { value: number; goal?: number }) {
  const r = 48
  const cx = 70
  const cy = 65
  const C = Math.PI * r
  const filled = Math.min(value / 100, 1) * C
  const color = value >= goal ? '#22c55e' : value >= goal * 0.7 ? '#f59e0b' : '#f87171'

  const goalAngle = (goal / 100) * Math.PI
  const gx = cx - r * Math.cos(goalAngle)
  const gy = cy - r * Math.sin(goalAngle)

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="85" viewBox="0 0 140 85">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${C}`}
        />
        <circle cx={gx} cy={gy} r="4" fill="#94a3b8" />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="22"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          {value}%
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="10"
          fontFamily="sans-serif"
        >
          meta: {goal}%
        </text>
      </svg>
      <span className="text-xs text-gray-500">Productividad hoy</span>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  unit,
  sub,
  color,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: string
  color: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

// ── Team Status Badge ─────────────────────────────────────────────────────────

function StatusBadge({
  count,
  label,
  color,
  bg,
}: {
  count: number
  label: string
  color: string
  bg: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: bg }}>
      <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="text-sm font-semibold" style={{ color }}>
        {count}
      </span>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function MetricsDashboard() {
  const [period, setPeriod] = useState<Period>(7)
  const [refreshing, setRefreshing] = useState(false)

  const settings = trpc.admin.getSettings.useQuery()

  const snapshot = trpc.admin.getTeamSnapshot.useQuery(undefined, { refetchInterval: 60000 })
  const kpis = trpc.admin.getTodayKpis.useQuery({ days: period }, { refetchInterval: 300000 })
  const categories = trpc.admin.getTopCategories.useQuery(
    { days: period },
    { refetchInterval: 300000 },
  )
  const workload = trpc.admin.getWorkloadTrend.useQuery(
    { days: period },
    { refetchInterval: 300000 },
  )
  const topUsers = trpc.admin.getTopUsers.useQuery(
    { days: period, metric: 'productivity_ratio', limit: 10 },
    { refetchInterval: 300000 },
  )

  const trigger = trpc.admin.triggerAggregation.useMutation({
    onSuccess: () => {
      void snapshot.refetch()
      void kpis.refetch()
      void categories.refetch()
      void workload.refetch()
      void topUsers.refetch()
      setRefreshing(false)
    },
    onError: () => setRefreshing(false),
  })

  const snap = snapshot.data
  const k = kpis.data
  const companyName = settings.data?.trade_name ?? settings.data?.legal_name ?? 'Mi empresa'

  return (
    <div className="space-y-5">
      <div className="hidden print:block">
        <ReportHeader
          logoUrl={settings.data?.logo_url}
          companyName={companyName}
          nit={settings.data?.nit}
          title="Reporte de Productividad"
          period={`Últimos ${PERIOD_LABELS[period]}`}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {([7, 14, 30] as Period[]).map((p) => (
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
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true)
              trigger.mutate({})
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Recalcular
          </button>
        </div>
      </div>

      {/* Team Now + Gauge */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Equipo ahora
          </h3>
          <div className="flex flex-wrap gap-3">
            <StatusBadge count={snap?.active ?? 0} label="activos" color="#16a34a" bg="#f0fdf4" />
            <StatusBadge count={snap?.passive ?? 0} label="en pausa" color="#d97706" bg="#fffbeb" />
            <StatusBadge count={snap?.offline ?? 0} label="offline" color="#64748b" bg="#f8fafc" />
          </div>
          {snap && snap.usersWithData > 0 && (
            <p className="mt-2 text-xs text-gray-400">
              {snap.usersWithData} usuario{snap.usersWithData !== 1 ? 's' : ''} con datos hoy ·{' '}
              {fmtHours(snap.totalActiveSecs)} tiempo activo acumulado
            </p>
          )}
        </div>
        <ProductivityGauge value={snap?.avgProductivity ?? 0} goal={70} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Mins productivas / sesión"
          value={k?.productiveMinPerSession ?? 0}
          unit="min"
          sub={`últimos ${period} días`}
          color="#3b82f6"
        />
        <KpiCard
          label="Horas productivas / día"
          value={k?.productiveHrsPerDay ?? 0}
          unit="h"
          sub="promedio por usuario"
          color="#22c55e"
        />
        <KpiCard
          label="Horas activas / día"
          value={k?.activeHrsPerDay ?? 0}
          unit="h"
          sub="tiempo conectado"
          color="#f59e0b"
        />
        <KpiCard
          label="Focus score"
          value={k?.focusScore ?? 0}
          unit="/ 100"
          sub="promedio del equipo"
          color={
            (k?.focusScore ?? 0) >= 70
              ? '#22c55e'
              : (k?.focusScore ?? 0) >= 50
                ? '#f59e0b'
                : '#f87171'
          }
        />
      </div>

      {/* Categories + Workload */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Categorías de apps ({PERIOD_LABELS[period]})
          </h3>
          {categories.isLoading ? (
            <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <DonutChart data={categories.data ?? []} />
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Carga de trabajo ({PERIOD_LABELS[period]})
          </h3>
          {workload.isLoading ? (
            <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <StackedBars data={workload.data ?? []} />
          )}
        </div>
      </div>

      {/* Top Users */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">
          Usuarios más productivos ({PERIOD_LABELS[period]})
        </h3>
        {topUsers.isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <TopUsersTable users={topUsers.data ?? []} />
        )}
      </div>

      <div className="hidden print:block">
        <ReportFooter companyName={companyName} />
      </div>
    </div>
  )
}
