'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { AlertTriangle, Clock, Ban, XCircle, ChevronRight } from 'lucide-react'

function RiskRow({
  tenantId,
  tenantName,
  planName,
  seats,
  badge,
  badgeColor,
  detail,
}: {
  tenantId: string
  tenantName: string
  planName: string
  seats: number
  badge: string
  badgeColor: string
  detail: string
}) {
  return (
    <Link
      href={`/super-admin/tenants/${tenantId}`}
      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{tenantName}</p>
        <p className="text-xs text-gray-400">
          {planName} · {seats} seats
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
          {badge}
        </span>
        <span className="text-xs text-gray-400">{detail}</span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
      </div>
    </Link>
  )
}

function Section({
  icon,
  title,
  count,
  accentColor,
  children,
}: {
  icon: React.ReactNode
  title: string
  count: number
  accentColor: string
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <div>
      <div className={`mb-1 flex items-center gap-2 px-3 py-1.5 ${accentColor} rounded-lg`}>
        {icon}
        <span className="text-xs font-semibold">{title}</span>
        <span className="ml-auto text-xs font-bold">{count}</span>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

export function TenantsAtRisk() {
  const { data, isLoading } = trpc.platform.getAtRiskTenants.useQuery(undefined, {
    refetchInterval: 5 * 60_000,
  })

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
  }

  if (!data) return null

  const totalAtRisk =
    data.trialExpiringSoon.length +
    data.trialExpired.length +
    data.suspended.length +
    data.licenseExpired.length

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <AlertTriangle
          className={`h-4 w-4 ${totalAtRisk > 0 ? 'text-amber-500' : 'text-gray-300'}`}
        />
        <h2 className="text-sm font-semibold text-gray-800">Tenants en riesgo</h2>
        {totalAtRisk > 0 && (
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {totalAtRisk}
          </span>
        )}
      </div>

      {totalAtRisk === 0 ? (
        <div className="flex flex-col items-center gap-1 px-5 py-8 text-center">
          <span className="text-2xl">✓</span>
          <p className="text-sm font-medium text-gray-600">Todo en orden</p>
          <p className="text-xs text-gray-400">No hay tenants que requieran atención</p>
        </div>
      ) : (
        <div className="space-y-3 px-2 py-3">
          <Section
            icon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
            title="Trial vencido"
            count={data.trialExpired.length}
            accentColor="bg-red-50 text-red-700"
          >
            {data.trialExpired.map((t) => (
              <RiskRow
                key={t.tenantId}
                tenantId={t.tenantId}
                tenantName={t.tenantName}
                planName={t.planName}
                seats={t.seats}
                badge="Vencido"
                badgeColor="bg-red-100 text-red-700"
                detail={t.trialEndsAt ? `venció ${formatRelative(t.trialEndsAt)}` : ''}
              />
            ))}
          </Section>

          <Section
            icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
            title="Trial por vencer (≤7 días)"
            count={data.trialExpiringSoon.length}
            accentColor="bg-amber-50 text-amber-700"
          >
            {data.trialExpiringSoon
              .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99))
              .map((t) => (
                <RiskRow
                  key={t.tenantId}
                  tenantId={t.tenantId}
                  tenantName={t.tenantName}
                  planName={t.planName}
                  seats={t.seats}
                  badge={t.daysLeft === 0 ? 'hoy' : `${t.daysLeft}d`}
                  badgeColor={
                    (t.daysLeft ?? 99) <= 2
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }
                  detail="restantes"
                />
              ))}
          </Section>

          <Section
            icon={<Ban className="h-3.5 w-3.5 text-yellow-500" />}
            title="Suspendidos"
            count={data.suspended.length}
            accentColor="bg-yellow-50 text-yellow-700"
          >
            {data.suspended.map((t) => (
              <RiskRow
                key={t.tenantId}
                tenantId={t.tenantId}
                tenantName={t.tenantName}
                planName={t.planName}
                seats={t.seats}
                badge="Suspendido"
                badgeColor="bg-yellow-100 text-yellow-700"
                detail={t.suspendedAt ? formatRelative(t.suspendedAt) : ''}
              />
            ))}
          </Section>

          <Section
            icon={<XCircle className="h-3.5 w-3.5 text-orange-500" />}
            title="Licencia expirada"
            count={data.licenseExpired.length}
            accentColor="bg-orange-50 text-orange-700"
          >
            {data.licenseExpired.map((t) => (
              <RiskRow
                key={t.tenantId}
                tenantId={t.tenantId}
                tenantName={t.tenantName}
                planName={t.planName}
                seats={t.seats}
                badge="Expirada"
                badgeColor="bg-orange-100 text-orange-700"
                detail={t.endsAt ? `desde ${formatRelative(t.endsAt)}` : ''}
              />
            ))}
          </Section>
        </div>
      )}
    </div>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days}d`
  const months = Math.floor(days / 30)
  return `hace ${months}m`
}
