'use client'

import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { formatDateTime } from '@/lib/format'
import { Activity } from 'lucide-react'

const ACTION_LABELS: Record<string, string> = {
  'tenant.created': 'Empresa creada',
  'tenant.updated': 'Empresa actualizada',
  'tenant.suspended': 'Empresa suspendida',
  'tenant.reactivated': 'Empresa reactivada',
  'tenant.impersonated': 'Impersonación',
  'tenant.trial_extended': 'Trial extendido',
  'tenant.maintenance_on': 'Modo mantenimiento activado',
  'tenant.maintenance_off': 'Modo mantenimiento desactivado',
  'user.login': 'Inicio de sesión',
  'user.logout': 'Cierre de sesión',
  'user.created': 'Usuario creado',
  'user.updated': 'Usuario actualizado',
  'license.created': 'Licencia creada',
  'license.updated': 'Licencia actualizada',
}

export function RecentAuditFeed() {
  const { data, isLoading } = trpc.platform.listAuditLogs.useQuery(
    { page: 1, pageSize: 8 },
    { refetchInterval: 60_000 },
  )

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Actividad reciente</h2>
        </div>
        <Link href="/super-admin/audit" className="text-xs text-blue-600 hover:underline">
          Ver todo →
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && (!data?.data || data.data.length === 0) && (
        <p className="py-6 text-center text-sm text-gray-400">Sin actividad registrada</p>
      )}

      <div className="space-y-1">
        {(
          data?.data as
            | Array<{
                id: number
                action: string
                entity_id: string | null
                actor_user_id: string | null
                occurred_at: string | null
              }>
            | undefined
        )?.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-gray-50"
          >
            <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-800">
                {ACTION_LABELS[entry.action] ?? entry.action}
                {entry.entity_id && (
                  <span className="ml-1 text-xs text-gray-400">
                    · {entry.entity_id.slice(0, 8)}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                {entry.actor_user_id ? entry.actor_user_id.slice(0, 8) : 'Sistema'} ·{' '}
                {formatDateTime(entry.occurred_at ?? '')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
