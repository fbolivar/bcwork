'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Bell, Plus, X, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

const RULE_TYPES = [
  { value: 'productivity_below', label: 'Productividad menor que', unit: '%', placeholder: '40' },
  {
    value: 'active_hours_below',
    label: 'Horas activas menor que',
    unit: 'h/día',
    placeholder: '4',
  },
  { value: 'overtime_above', label: 'Horas extra mayor que', unit: 'h/día', placeholder: '2' },
  { value: 'no_activity', label: 'Sin actividad por más de', unit: 'días', placeholder: '2' },
]

export function AlertRulesPanel() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)

  const [name, setName] = useState('')
  const [ruleType, setRuleType] = useState('productivity_below')
  const [threshold, setThreshold] = useState('')
  const [consecutiveDays, setConsecutiveDays] = useState(1)

  const { data: rules, isLoading } = trpc.manager.getAlertRules.useQuery()
  const allRules = (rules ?? []) as any[]

  const create = trpc.manager.createAlertRule.useMutation({
    onSuccess: () => {
      utils.manager.getAlertRules.invalidate()
      setShowCreate(false)
      setName('')
      setThreshold('')
      setConsecutiveDays(1)
    },
  })

  const toggle = trpc.manager.toggleAlertRule.useMutation({
    onSuccess: () => utils.manager.getAlertRules.invalidate(),
  })

  const deleteRule = trpc.manager.deleteAlertRule.useMutation({
    onSuccess: () => utils.manager.getAlertRules.invalidate(),
  })

  const selectedType = RULE_TYPES.find((r) => r.value === ruleType) ?? RULE_TYPES[0]!

  function getRuleDescription(rule: any): string {
    const rt = RULE_TYPES.find((r) => r.value === rule.rule_type)
    if (!rt) return rule.rule_type
    return `${rt.label} ${rule.threshold_value}${rt.unit}${rule.consecutive_days > 1 ? ` por ${rule.consecutive_days} días seguidos` : ''}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Alertas configurables</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Recibe notificaciones cuando el equipo supera umbrales
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nueva alerta
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allRules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay alertas configuradas</p>
          <p className="mt-1 text-xs text-gray-400">
            Crea una alerta para monitorear métricas clave
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allRules.map((rule: any) => (
            <div
              key={rule.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                rule.is_active ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  rule.is_active ? 'bg-blue-100' : 'bg-gray-100'
                }`}
              >
                <Bell className={`h-4 w-4 ${rule.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${rule.is_active ? 'text-gray-800' : 'text-gray-400'}`}
                >
                  {rule.name}
                </p>
                <p className="text-xs text-gray-400">{getRuleDescription(rule)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle.mutate({ id: rule.id, is_active: !rule.is_active })}
                  disabled={toggle.isPending}
                  className="text-gray-400 hover:text-blue-600"
                  title={rule.is_active ? 'Desactivar' : 'Activar'}
                >
                  {rule.is_active ? (
                    <ToggleRight className="h-5 w-5 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Eliminar esta alerta?')) deleteRule.mutate({ id: rule.id })
                  }}
                  disabled={deleteRule.isPending}
                  className="text-gray-300 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-medium text-blue-700">¿Cómo funcionan las alertas?</p>
        <p className="mt-1 text-xs text-blue-600">
          Cuando se cumple una condición durante el número de días configurado, recibirás una
          notificación en el panel. Las alertas se evalúan diariamente con los datos del día
          anterior.
        </p>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nueva alerta</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Nombre de la alerta</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Productividad baja semana"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Condición</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  {RULE_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Umbral ({selectedType?.unit})
                  </label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder={selectedType?.placeholder}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Días consecutivos</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={consecutiveDays}
                    onChange={(e) => setConsecutiveDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!name.trim() || !threshold || create.isPending}
                onClick={() =>
                  create.mutate({
                    name,
                    rule_type: ruleType,
                    threshold_value: Number(threshold),
                    consecutive_days: consecutiveDays,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear alerta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
