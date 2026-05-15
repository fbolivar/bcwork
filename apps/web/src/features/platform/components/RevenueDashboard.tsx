'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { formatCOP } from '@/lib/format'

const PLAN_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981']
const PLAN_DOT_CLASSES = [
  'bg-blue-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-emerald-500',
]

function yFmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

function MomBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">Sin datos previos</span>
  if (pct > 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-green-600">
        <TrendingUp className="h-3 w-3" />+{pct}% vs mes anterior
      </span>
    )
  if (pct < 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500">
        <TrendingDown className="h-3 w-3" />
        {pct}% vs mes anterior
      </span>
    )
  return (
    <span className="flex items-center gap-0.5 text-xs text-gray-400">
      <Minus className="h-3 w-3" />
      Sin cambio
    </span>
  )
}

export function RevenueDashboard() {
  const { data, isLoading: loadingBase } = trpc.platform.getRevenueData.useQuery(undefined, {
    refetchInterval: 60_000,
  })
  const { data: trend, isLoading: loadingTrend } = trpc.platform.getRevenueTrend.useQuery(
    undefined,
    { refetchInterval: 60_000 },
  )

  const isLoading = loadingBase || loadingTrend

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!data || !trend) return null

  const chartData = data.byPlan
    .filter((p) => p.mrr > 0)
    .map((p) => ({ name: p.planName, mrr: p.mrr, seats: p.seats, count: p.count }))

  return (
    <div className="space-y-6">
      {/* KPI row: MRR, ARR, New, Churn */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">MRR actual</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCOP(trend.currentMrr)}</p>
          <div className="mt-1">
            <MomBadge pct={trend.mrrChangePercent} />
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">ARR proyectado</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCOP(trend.arr)}</p>
          <p className="mt-1 text-xs text-gray-400">MRR × 12</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Nuevo MRR este mes</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            +{formatCOP(trend.newMrrThisMonth)}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Licencias activadas en {new Date().toLocaleDateString('es-CO', { month: 'long' })}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">MRR perdido este mes</p>
          <p
            className={`mt-1 text-2xl font-bold ${trend.churnedMrrThisMonth > 0 ? 'text-red-500' : 'text-gray-400'}`}
          >
            -{formatCOP(trend.churnedMrrThisMonth)}
          </p>
          <p className="mt-1 text-xs text-gray-400">Cancelaciones y suspensiones</p>
        </div>
      </div>

      {/* Tendencia 6 meses */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Tendencia 6 meses — nuevo vs perdido
        </h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={yFmt} tick={{ fontSize: 11 }} width={56} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCOP(value),
                  name === 'newMrr' ? 'Nuevo MRR' : 'MRR perdido',
                ]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend
                formatter={(v) => (v === 'newMrr' ? 'Nuevo MRR' : 'MRR perdido')}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="newMrr"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="churnedMrr"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MRR por plan */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">MRR por plan</h2>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Sin datos de licencias activas</p>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={36}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={yFmt} tick={{ fontSize: 11 }} width={56} />
                <Tooltip
                  formatter={(value: number) => [formatCOP(value), 'MRR']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="mrr" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={PLAN_COLORS[idx % PLAN_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {data.byPlan.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-left text-xs font-medium text-gray-500">Plan</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500">Clientes</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500">Seats</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.byPlan.map((plan, idx) => (
                  <tr key={plan.planId} className="hover:bg-gray-50">
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${PLAN_DOT_CLASSES[idx % PLAN_DOT_CLASSES.length]}`}
                        />
                        {plan.planName}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{plan.count}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{plan.seats}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-gray-900">
                      {plan.mrr > 0 ? formatCOP(plan.mrr) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top 10 clientes */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Top 10 clientes por MRR</h2>
        {data.topTenants.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Sin datos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500">Empresa</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500">Plan</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500">Seats</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.topTenants.map((t, idx) => (
                  <tr key={t.tenantId} className="hover:bg-gray-50">
                    <td className="py-2 text-xs text-gray-400">{idx + 1}</td>
                    <td className="py-2 font-medium text-gray-900">{t.tenantName}</td>
                    <td className="py-2">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium uppercase">
                        {t.planName}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{t.seats}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-gray-900">
                      {formatCOP(t.mrr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
