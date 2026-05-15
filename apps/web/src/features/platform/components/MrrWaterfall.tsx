'use client'

import { trpc } from '@/lib/trpc-client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

function formatK(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val}`
}

export function MrrWaterfall() {
  const { data, isLoading } = trpc.platform.getMrrWaterfall.useQuery(undefined, {
    refetchInterval: 300_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-52 animate-pulse rounded-lg bg-gray-100" />
      </div>
    )
  }

  const months = data ?? []
  const totalNew = months.reduce((s, m) => s + m.newMrr, 0)
  const totalChurned = months.reduce((s, m) => s + m.churnedMrr, 0)
  const totalNet = totalNew - totalChurned

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">MRR Waterfall — últimos 6 meses</h2>
          <p className="mt-0.5 text-xs text-gray-400">Nuevo MRR vs MRR perdido por mes</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xs text-gray-400">Nuevo acum.</p>
            <p className="text-sm font-bold text-green-600">{formatK(totalNew)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Churned acum.</p>
            <p className="text-sm font-bold text-red-500">{formatK(totalChurned)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Neto acum.</p>
            <p className={`text-sm font-bold ${totalNet >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {totalNet >= 0 ? '+' : ''}
              {formatK(totalNet)}
            </p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={months} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            formatter={(val: number, name: string) => [
              formatK(val),
              name === 'newMrr' ? 'Nuevo MRR' : name === 'churnedMrr' ? 'MRR Perdido' : 'Neto',
            ]}
            labelStyle={{ fontSize: 12, fontWeight: 600 }}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Legend
            iconType="square"
            iconSize={8}
            formatter={(val) =>
              val === 'newMrr' ? 'Nuevo MRR' : val === 'churnedMrr' ? 'MRR Perdido' : 'Neto MRR'
            }
            wrapperStyle={{ fontSize: 11 }}
          />
          <ReferenceLine y={0} stroke="#e2e8f0" />
          <Bar dataKey="newMrr" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="churnedMrr" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="netNew" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
