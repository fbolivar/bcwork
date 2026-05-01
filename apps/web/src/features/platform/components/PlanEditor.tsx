'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { formatCOP } from '@/lib/format'

const FEATURE_KEYS = [
  'office_vs_remote',
  'productivity_map',
  'scheduled_reports',
  'api_access',
  'payroll_export',
  'sso',
  'extended_retention',
] as const

type Plan = {
  id: string
  code: string
  name: string
  monthly_price_per_seat_cop: number
  features: Record<string, boolean>
  is_active: boolean
}

export function PlanEditor() {
  const { data: plans, isLoading, refetch } = trpc.platform.listPlans.useQuery()
  const updateMutation = trpc.platform.updatePlan.useMutation({ onSuccess: () => refetch() })
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Plan>>({})

  function startEdit(plan: Plan) {
    setEditing(plan.id)
    setDraft({
      name: plan.name,
      monthly_price_per_seat_cop: plan.monthly_price_per_seat_cop,
      features: { ...(plan.features as Record<string, boolean>) },
      is_active: plan.is_active,
    })
  }

  function toggleFeature(key: string) {
    setDraft((d) => ({
      ...d,
      features: { ...(d.features ?? {}), [key]: !(d.features?.[key] ?? false) },
    }))
  }

  if (isLoading) return <p className="text-sm text-gray-400">Cargando planes...</p>

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {(plans ?? []).map((plan) => {
        const isEdit = editing === plan.id
        const p = plan as Plan

        return (
          <div key={plan.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
                {plan.code}
              </span>
              {!plan.is_active && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
                  Inactivo
                </span>
              )}
            </div>

            {isEdit ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Nombre</label>
                  <input
                    value={draft.name ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Precio COP/seat/mes
                  </label>
                  <input
                    type="number"
                    value={draft.monthly_price_per_seat_cop ?? 0}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        monthly_price_per_seat_cop: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-600">Features</p>
                  {FEATURE_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 py-0.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={draft.features?.[key] ?? false}
                        onChange={() => toggleFeature(key)}
                        className="rounded"
                      />
                      {key.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        id: plan.id,
                        name: draft.name,
                        monthly_price_per_seat_cop: draft.monthly_price_per_seat_cop,
                        features: draft.features as Record<string, boolean>,
                      })
                    }
                    disabled={updateMutation.isPending}
                    className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded border px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-900">{p.name}</p>
                <p className="mb-3 text-sm text-gray-500">
                  {formatCOP(p.monthly_price_per_seat_cop)}/seat/mes
                </p>
                <ul className="mb-4 space-y-1">
                  {FEATURE_KEYS.map((key) => {
                    const active = (p.features as Record<string, boolean>)?.[key]
                    return (
                      <li
                        key={key}
                        className={`flex items-center gap-1.5 text-xs ${active ? 'text-gray-700' : 'text-gray-300'}`}
                      >
                        <span>{active ? '✓' : '✗'}</span>
                        {key.replace(/_/g, ' ')}
                      </li>
                    )
                  })}
                </ul>
                <button
                  onClick={() => startEdit(p)}
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  Editar
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
