'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { StatusBadge } from './StatusBadge'
import { formatCOP, formatDate } from '@/lib/format'

interface License {
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
}

export function LicenseCard({
  license,
  tenantId,
  onUpdated,
}: {
  license: License
  tenantId: string
  onUpdated: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [seats, setSeats] = useState(license.seats_total)
  const [newStatus, setNewStatus] = useState(license.status)

  const updateMutation = trpc.platform.updateLicense.useMutation({
    onSuccess: () => {
      setEditing(false)
      onUpdated()
    },
  })

  const mrr = (license.plans?.monthly_price_per_seat_cop ?? 0) * license.seats_total
  const effectiveEnd = license.trial_ends_at ?? license.ends_at

  const featureFlags = {
    ...((license.plans?.features as Record<string, boolean> | undefined) ?? {}),
    ...(license.feature_overrides ?? {}),
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Plan {license.plans?.name ?? '—'}</h3>
          <p className="text-sm text-gray-500">
            {formatCOP(mrr)}/mes · {license.seats_total} seats
          </p>
        </div>
        <StatusBadge status={license.status} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">Vence</p>
          <p className="font-medium">{formatDate(effectiveEnd)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">MRR</p>
          <p className="font-medium">{license.status === 'active' ? formatCOP(mrr) : '—'}</p>
        </div>
      </div>

      {/* Feature flags */}
      <div className="mb-4 rounded-lg bg-gray-50 p-3">
        <p className="mb-2 text-xs font-medium text-gray-500">Features activos</p>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(featureFlags).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <span className={val ? 'text-green-500' : 'text-gray-300'}>{val ? '✓' : '✗'}</span>
              <span className={val ? 'text-gray-700' : 'text-gray-400'}>
                {key.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          Editar licencia
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Seats</label>
            <input
              type="number"
              min={1}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded border px-2 py-1 text-sm"
            >
              <option value="trial">Trial</option>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                updateMutation.mutate({
                  licenseId: license.id,
                  seats_total: seats,
                  status: newStatus as 'active' | 'suspended' | 'cancelled',
                })
              }
              disabled={updateMutation.isPending}
              className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-white"
            >
              Cancelar
            </button>
          </div>
          {updateMutation.error && (
            <p className="text-xs text-red-600">{updateMutation.error.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
