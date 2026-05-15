'use client'

import { trpc } from '@/lib/trpc-client'
import { Activity, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react'

function DeltaBadge({ now, yesterday }: { now: number; yesterday: number }) {
  if (yesterday === 0 && now === 0) return null
  const diff = now - yesterday
  if (diff === 0) return <Minus className="h-3 w-3 text-gray-400" />
  if (diff > 0)
    return (
      <span className="flex items-center gap-0.5 text-xs text-green-600">
        <TrendingUp className="h-3 w-3" />+{diff}
      </span>
    )
  return (
    <span className="flex items-center gap-0.5 text-xs text-red-500">
      <TrendingDown className="h-3 w-3" />
      {diff}
    </span>
  )
}

export function LiveActivityWidget() {
  const { data, isLoading } = trpc.platform.getLiveActivity.useQuery(undefined, {
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-gray-100" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  const items = data?.tenants ?? []

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <h2 className="text-sm font-semibold text-gray-700">Actividad en tiempo real</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            {data?.activeTenants ?? 0} empresas activas
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {data?.totalActiveUsers ?? 0} usuarios
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          Sin sesiones activas en los últimos 15 minutos
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 8).map((t) => (
            <div
              key={t.tenantId}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-700">
                  {t.tenantName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.tenantName}</p>
                  <p className="text-xs capitalize text-gray-400">{t.tenantStatus}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DeltaBadge now={t.activeUsers} yesterday={t.yesterdayUsers} />
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                  <Users className="h-3 w-3" />
                  {t.activeUsers}
                </span>
              </div>
            </div>
          ))}
          {items.length > 8 && (
            <p className="pt-1 text-center text-xs text-gray-400">
              +{items.length - 8} empresas más con actividad
            </p>
          )}
        </div>
      )}
    </div>
  )
}
