'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { StatusBadge } from './StatusBadge'
import { LicenseCard } from './LicenseCard'
import { AuditLogTable } from './AuditLogTable'
import { formatDate } from '@/lib/format'
import { ArrowLeft } from 'lucide-react'

export function TenantDetail({ tenantId }: { tenantId: string }) {
  const { data: tenant, isLoading, refetch } = trpc.platform.getTenant.useQuery({ id: tenantId })
  const updateMutation = trpc.platform.updateTenant.useMutation({ onSuccess: () => refetch() })

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
  }

  if (!tenant) {
    return <p className="text-red-500">Empresa no encontrada</p>
  }

  const licenses =
    (tenant.licenses as Array<{
      id: string
      status: string
      seats_total: number
      ends_at: string
      trial_ends_at: string | null
      feature_overrides: Record<string, boolean> | null
      plans: {
        id?: string
        code: string
        name: string
        monthly_price_per_seat_cop: number
        features?: Record<string, boolean>
      } | null
    }>) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/super-admin/tenants"
          className="mt-1 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              {tenant.trade_name ?? tenant.legal_name}
            </h1>
            <StatusBadge status={tenant.status} />
          </div>
          <p className="text-sm text-gray-500">
            NIT: {tenant.nit} · {tenant.contact_email} · {tenant.activeUserCount} usuarios activos
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info + acciones */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Datos de la empresa</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Razón social" value={tenant.legal_name} />
              <Row label="Nombre comercial" value={tenant.trade_name ?? '—'} />
              <Row label="NIT" value={tenant.nit} mono />
              <Row label="Timezone" value={tenant.timezone ?? '—'} />
              <Row label="Retención datos" value={`${tenant.data_retention_months ?? '—'} meses`} />
              <Row label="Oficial HABEAS DATA" value={tenant.data_protection_officer ?? '—'} />
              <Row label="Creado" value={formatDate(tenant.created_at ?? '')} />
            </dl>
          </div>

          {/* Acciones rápidas */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Acciones rápidas</h2>
            <div className="space-y-2">
              {tenant.status !== 'suspended' && (
                <button
                  onClick={() => updateMutation.mutate({ id: tenantId, status: 'suspended' })}
                  disabled={updateMutation.isPending}
                  className="w-full rounded-md border border-yellow-300 px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                >
                  Suspender empresa
                </button>
              )}
              {tenant.status === 'suspended' && (
                <button
                  onClick={() => updateMutation.mutate({ id: tenantId, status: 'active' })}
                  disabled={updateMutation.isPending}
                  className="w-full rounded-md border border-green-300 px-3 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
                >
                  Reactivar empresa
                </button>
              )}
              {tenant.status !== 'cancelled' && (
                <button
                  onClick={() => {
                    if (confirm('¿Cancelar esta empresa? Esta acción no se puede deshacer.')) {
                      updateMutation.mutate({ id: tenantId, status: 'cancelled' })
                    }
                  }}
                  disabled={updateMutation.isPending}
                  className="w-full rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancelar empresa
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Licencias */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Licencias</h2>
          {licenses.length === 0 && <p className="text-sm text-gray-400">Sin licencias</p>}
          {licenses.map((lic) => (
            <LicenseCard key={lic.id} license={lic} tenantId={tenantId} onUpdated={refetch} />
          ))}
        </div>

        {/* Audit log del tenant */}
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Historial de auditoría</h2>
          <AuditLogTable tenantId={tenantId} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-right text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}
