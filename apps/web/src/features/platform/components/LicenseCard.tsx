'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { StatusBadge } from './StatusBadge'
import { formatCOP, formatDate } from '@/lib/format'
import { ChevronDown, ChevronUp } from 'lucide-react'

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

const FEATURE_LABELS: Record<string, string> = {
  sso: 'SSO',
  api_access: 'Acceso API',
  payroll_export: 'Exportar nómina',
  office_vs_remote: 'Oficina vs Remoto',
  productivity_map: 'Mapa de productividad',
  scheduled_reports: 'Reportes programados',
  extended_retention: 'Retención extendida',
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
  const [editingFlags, setEditingFlags] = useState(false)
  const [seats, setSeats] = useState(license.seats_total)
  const [newStatus, setNewStatus] = useState(license.status)
  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    license.feature_overrides ?? {},
  )

  const updateMutation = trpc.platform.updateLicense.useMutation({
    onSuccess: () => {
      setEditing(false)
      onUpdated()
    },
  })

  const flagsMutation = trpc.platform.updateFeatureOverrides.useMutation({
    onSuccess: () => {
      setEditingFlags(false)
      onUpdated()
    },
  })

  const mrr = (license.plans?.monthly_price_per_seat_cop ?? 0) * license.seats_total
  const effectiveEnd = license.trial_ends_at ?? license.ends_at

  const basePlanFeatures = (license.plans?.features as Record<string, boolean> | undefined) ?? {}
  // Merged view: plan defaults + overrides
  const mergedFeatures: Record<string, boolean> = { ...basePlanFeatures, ...overrides }

  // All known feature keys (union of plan features + FEATURE_LABELS)
  const allFeatureKeys = Array.from(
    new Set([...Object.keys(basePlanFeatures), ...Object.keys(FEATURE_LABELS)]),
  )

  function toggleOverride(key: string, current: boolean) {
    setOverrides((prev) => ({ ...prev, [key]: !current }))
  }

  // Has any override that differs from the plan default?
  const hasOverrides = allFeatureKeys.some(
    (k) => overrides[k] !== undefined && overrides[k] !== basePlanFeatures[k],
  )

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

      {/* Feature flags section */}
      <div className="mb-4 rounded-lg bg-gray-50 p-3">
        <button
          type="button"
          onClick={() => setEditingFlags((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            Features activos
            {hasOverrides && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                overrides
              </span>
            )}
          </span>
          {editingFlags ? (
            <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          )}
        </button>

        {!editingFlags && (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {allFeatureKeys.map((key) => {
              const effective = mergedFeatures[key] ?? false
              const isOverridden =
                overrides[key] !== undefined && overrides[key] !== basePlanFeatures[key]
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <span className={effective ? 'text-green-500' : 'text-gray-300'}>
                    {effective ? '✓' : '✗'}
                  </span>
                  <span
                    className={`${effective ? 'text-gray-700' : 'text-gray-400'} ${isOverridden ? 'font-semibold' : ''}`}
                  >
                    {FEATURE_LABELS[key] ?? key.replace(/_/g, ' ')}
                    {isOverridden && <span className="ml-1 text-amber-500">*</span>}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {editingFlags && (
          <div className="mt-3 space-y-2">
            {allFeatureKeys.map((key) => {
              const planDefault = basePlanFeatures[key] ?? false
              const currentVal = overrides[key] !== undefined ? overrides[key] : planDefault
              const isOverridden = overrides[key] !== undefined && overrides[key] !== planDefault
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between py-0.5"
                >
                  <span className="text-xs text-gray-700">
                    {FEATURE_LABELS[key] ?? key.replace(/_/g, ' ')}
                    {isOverridden && (
                      <span className="ml-1.5 text-xs text-amber-500">
                        (plan: {planDefault ? 'ON' : 'OFF'})
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={currentVal ? 'true' : 'false'}
                    onClick={() => toggleOverride(key, currentVal)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none ${
                      currentVal ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                        currentVal ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              )
            })}
            {flagsMutation.error && (
              <p className="text-xs text-red-600">{flagsMutation.error.message}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={flagsMutation.isPending}
                onClick={() => flagsMutation.mutate({ licenseId: license.id, overrides })}
                className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {flagsMutation.isPending ? 'Guardando...' : 'Guardar flags'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOverrides(license.feature_overrides ?? {})
                  setEditingFlags(false)
                }}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* License edit section */}
      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          Editar licencia
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div>
            <label
              className="mb-1 block text-xs font-medium text-gray-600"
              htmlFor={`seats-${license.id}`}
            >
              Seats
            </label>
            <input
              id={`seats-${license.id}`}
              type="number"
              min={1}
              title="Número de seats"
              placeholder="10"
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-gray-600"
              htmlFor={`status-${license.id}`}
            >
              Estado
            </label>
            <select
              id={`status-${license.id}`}
              title="Estado de la licencia"
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
              type="button"
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
              type="button"
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
