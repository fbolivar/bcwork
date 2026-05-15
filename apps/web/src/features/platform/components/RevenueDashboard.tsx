'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { trpc } from '@/lib/trpc-client'
import { formatCOP } from '@/lib/format'

const PLAN_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981']

export function RevenueDashboard() {
  const { data, isLoading } = trpc.platform.getRevenueData.useQuery(undefined, {
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const chartData = data.byPlan
    .filter((p) => p.mrr > 0)
    .map((p) => ({ name: p.planName, mrr: p.mrr, seats: p.seats, count: p.count }))

  return (
    <div className="space-y-6">
      {/* MRR total */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm font-medium text-gray-500">MRR total</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{formatCOP(data.totalMrr)}</p>
        <p className="mt-1 text-xs text-gray-400">Basado en licencias activas únicamente</p>
      </div>

      {/* MRR por plan */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">MRR por plan</h2>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Sin datos de licencias activas</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={36}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}K`
                        : String(v)
                  }
                  tick={{ fontSize: 11 }}
                  width={56}
                />
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

        {/* Summary table */}
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
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: PLAN_COLORS[idx % PLAN_COLORS.length] }}
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

      {/* Top 10 tenants por MRR */}
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
