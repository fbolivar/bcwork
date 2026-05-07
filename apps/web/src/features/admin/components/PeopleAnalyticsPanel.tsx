'use client'

import { trpc as api } from '@/lib/trpc-client'
import { Users, TrendingUp, Clock, Star, Activity, BarChart2, UserCheck } from 'lucide-react'

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'blue',
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'cyan'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  }
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className={`rounded-lg p-2 ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function BarRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 truncate text-sm text-gray-600">{label}</span>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-blue-50">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="w-8 text-right text-xs font-semibold text-gray-700">{count}</span>
    </div>
  )
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic',
}

export function PeopleAnalyticsPanel() {
  const { data, isLoading } = api.admin.getPeopleAnalytics.useQuery()

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Cargando analíticas...
      </div>
    )
  }

  if (!data) return null

  const maxHires = Math.max(
    ...data.hiresByMonth.map((m: { month: string; count: number }) => m.count),
    1,
  )

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total empleados" value={data.headcount} icon={Users} color="blue" />
        <StatCard
          label="Activos (30 días)"
          value={data.activeCount}
          sub={`${data.headcount > 0 ? Math.round((data.activeCount / data.headcount) * 100) : 0}% del total`}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          label="Horas prom. (90d)"
          value={`${data.avgHoursLast90d}h`}
          sub="por colaborador"
          icon={Clock}
          color="cyan"
        />
        <StatCard
          label="Rating prom."
          value={data.avgPerformanceRating ?? '—'}
          sub="performance reviews"
          icon={Star}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Headcount por departamento */}
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Headcount por departamento</h3>
          </div>
          <div className="space-y-3">
            {data.headcountByDept.slice(0, 8).map(([dept, count]: [string, number]) => (
              <BarRow key={dept} label={dept} count={count} total={data.headcount} />
            ))}
            {data.headcountByDept.length === 0 && (
              <p className="text-sm text-gray-400">Sin datos</p>
            )}
          </div>
        </div>

        {/* Distribución por rol */}
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-700">Distribución por rol</h3>
          </div>
          <div className="space-y-3">
            {data.roleDistribution.map(([role, count]: [string, number]) => (
              <BarRow key={role} label={role} count={count} total={data.headcount} />
            ))}
            {data.roleDistribution.length === 0 && (
              <p className="text-sm text-gray-400">Sin datos</p>
            )}
          </div>
        </div>

        {/* Ingresos por mes */}
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold text-gray-700">
              Nuevos ingresos (últimos 6 meses)
            </h3>
          </div>
          <div className="flex items-end gap-2 pt-2">
            {data.hiresByMonth.map(({ month, count }: { month: string; count: number }) => {
              const parts = month.split('-')
              const mm = parts[1] ?? ''
              const h = maxHires > 0 ? Math.max(8, Math.round((count / maxHires) * 120)) : 8
              return (
                <div key={month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-gray-700">{count || ''}</span>
                  <div
                    className="w-full rounded-t-md bg-green-400 transition-all"
                    style={{ height: `${h}px` }}
                  />
                  <span className="text-[10px] text-gray-400">{MONTH_LABELS[mm] ?? mm}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ausencias por tipo */}
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">Ausencias aprobadas por tipo</h3>
          </div>
          <div className="space-y-3">
            {data.absencesByType.slice(0, 6).map(([type, count]: [string, number]) => {
              const total = data.absencesByType.reduce(
                (s: number, [, c]: [string, number]) => s + c,
                0,
              )
              return <BarRow key={type} label={type} count={count} total={total} />
            })}
            {data.absencesByType.length === 0 && (
              <p className="text-sm text-gray-400">Sin ausencias aprobadas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
