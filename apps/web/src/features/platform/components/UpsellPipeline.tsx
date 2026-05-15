'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { TrendingUp, Users, Zap, RefreshCw, ChevronRight } from 'lucide-react'

const TYPE_CONFIG = {
  seat_expansion: {
    label: 'Expansión de asientos',
    icon: Users,
    color: 'text-blue-600 bg-blue-50',
    border: 'border-blue-200',
  },
  plan_upgrade: {
    label: 'Upgrade de plan',
    icon: Zap,
    color: 'text-violet-600 bg-violet-50',
    border: 'border-violet-200',
  },
  reactivation: {
    label: 'Reactivación',
    icon: RefreshCw,
    color: 'text-orange-600 bg-orange-50',
    border: 'border-orange-200',
  },
} as const

const PRIORITY_BADGE = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

type OppType = 'seat_expansion' | 'plan_upgrade' | 'reactivation' | 'all'

export function UpsellPipeline() {
  const [typeFilter, setTypeFilter] = useState<OppType>('all')

  const { data, isLoading } = trpc.platform.getUpsellPipeline.useQuery(undefined, {
    refetchInterval: 300_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-gray-100" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  const items = (data?.items ?? []).filter((o) => typeFilter === 'all' || o.type === typeFilter)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Pipeline de Upsell</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Oportunidades de expansión identificadas automáticamente
          </p>
        </div>
        <div className="flex gap-2 text-right">
          {[
            { label: 'Alta', val: data?.high ?? 0, cls: 'text-red-600' },
            { label: 'Media', val: data?.medium ?? 0, cls: 'text-amber-600' },
            { label: 'Baja', val: data?.low ?? 0, cls: 'text-gray-500' },
          ].map((kpi) => (
            <div key={kpi.label}>
              <p className="text-xs text-gray-400">{kpi.label}</p>
              <p className={`text-sm font-bold ${kpi.cls}`}>{kpi.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2">
        {(['all', 'seat_expansion', 'plan_upgrade', 'reactivation'] as OppType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              typeFilter === t
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'all'
              ? `Todos (${data?.total ?? 0})`
              : TYPE_CONFIG[t as keyof typeof TYPE_CONFIG].label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center">
          <TrendingUp className="mx-auto mb-2 h-8 w-8 text-gray-200" />
          <p className="text-sm text-gray-400">Sin oportunidades en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((opp) => {
            const cfg = TYPE_CONFIG[opp.type]
            const Icon = cfg.icon
            return (
              <div
                key={`${opp.tenantId}-${opp.type}`}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${cfg.border} bg-white hover:bg-gray-50/50`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-800">{opp.tenantName}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[opp.priority]}`}
                    >
                      {opp.priority === 'high'
                        ? 'Alta'
                        : opp.priority === 'medium'
                          ? 'Media'
                          : 'Baja'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{opp.notes}</p>
                  {opp.tags.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {opp.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400">Plan actual</p>
                  <p className="text-sm font-semibold uppercase text-gray-700">{opp.currentPlan}</p>
                  {opp.seats.total > 0 && (
                    <p className="text-xs text-gray-400">
                      {opp.seats.used}/{opp.seats.total} seats
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
