'use client'

import { trpc } from '@/lib/trpc-client'
import { MetricCard } from './MetricCard'
import { formatCOP } from '@/lib/format'

export function MetricsSummary() {
  const { data, isLoading } = trpc.platform.getMetrics.useQuery(undefined, {
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="MRR"
          value={formatCOP(data.mrrCop)}
          sub="Solo licencias activas"
          accent="green"
        />
        <MetricCard
          label="Tenants activos"
          value={data.activeTenants}
          sub={`${data.trialTenants} en trial`}
          accent="blue"
        />
        <MetricCard
          label="Total seats activos"
          value={data.totalSeats}
          sub={`${data.trialSeats} en trial`}
        />
        <MetricCard
          label="Usuarios activos"
          value={data.activeUsers}
          sub="Excluyendo platform_admin"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total empresas" value={data.totalTenants} />
        <MetricCard
          label="Suspendidos"
          value={data.suspendedTenants}
          {...(data.suspendedTenants > 0 ? { accent: 'yellow' as const } : {})}
        />
        <MetricCard
          label="Churn últimos 30 días"
          value={data.churnedLast30Days}
          {...(data.churnedLast30Days > 0 ? { accent: 'red' as const } : {})}
        />
      </div>
    </div>
  )
}
