'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { trpc } from '@/lib/trpc-client'

const STATUS_COLORS: Record<string, string> = {
  Activos: '#3b82f6',
  Trial: '#f59e0b',
  Suspendidos: '#ef4444',
  Cancelados: '#d1d5db',
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  )
}

function GrowthChart() {
  const { data, isLoading } = trpc.platform.getGrowthData.useQuery(undefined, {
    staleTime: 5 * 60_000,
  })

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
  if (!data?.length) return <p className="text-sm text-gray-400">Sin datos</p>

  const max = Math.max(...data.map((d) => d.nuevos), 1)

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, max + 1]}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: '#f3f4f6' }}
          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          formatter={(v: number) => [v, 'Nuevos tenants']}
          labelFormatter={(l) => `Mes: ${l}`}
        />
        <Bar dataKey="nuevos" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === data.length - 1 ? '#3b82f6' : '#93c5fd'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function StatusDonut() {
  const { data, isLoading } = trpc.platform.getMetrics.useQuery(undefined, {
    staleTime: 60_000,
  })

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
  if (!data) return null

  const segments = [
    { name: 'Activos', value: data.activeTenants },
    { name: 'Trial', value: data.trialTenants },
    { name: 'Suspendidos', value: data.suspendedTenants },
    {
      name: 'Cancelados',
      value: data.totalTenants - data.activeTenants - data.trialTenants - data.suspendedTenants,
    },
  ].filter((s) => s.value > 0)

  const total = data.totalTenants

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={segments}
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={64}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {segments.map((s, i) => (
                <Cell key={i} fill={STATUS_COLORS[s.name] ?? '#d1d5db'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{total}</span>
          <span className="text-xs text-gray-400">total</span>
        </div>
      </div>

      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[s.name] ?? '#d1d5db' }}
            />
            <span className="text-gray-600">{s.name}</span>
            <span className="ml-auto font-semibold text-gray-900">{s.value}</span>
            <span className="w-8 text-right text-xs text-gray-400">
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MetricsCharts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="Nuevos tenants por mes">
        <GrowthChart />
      </ChartCard>
      <ChartCard title="Distribución por estado">
        <StatusDonut />
      </ChartCard>
    </div>
  )
}
