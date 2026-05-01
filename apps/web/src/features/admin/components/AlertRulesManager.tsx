'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, Trash2, ToggleLeft, ToggleRight, Zap } from 'lucide-react'
import { formatDate } from '@/lib/format'

const RULE_TYPE_LABELS: Record<string, string> = {
  low_productivity: 'Productividad baja',
  overtime: 'Horas extra',
  inactivity: 'Inactividad',
  high_non_productive: 'Alto tiempo no productivo',
}

const RULE_TYPE_HINT: Record<string, string> = {
  low_productivity: 'Umbral en % (ej: 40 = productividad < 40%)',
  overtime: 'Umbral en horas (ej: 2 = más de 2h overtime/día)',
  inactivity: 'Umbral en horas (ej: 4 = menos de 4h activo/día)',
  high_non_productive: 'Umbral en % (ej: 50 = más de 50% no productivo)',
}

const SEVERITY_BADGE: Record<string, string> = {
  low_productivity: 'bg-amber-100 text-amber-700',
  overtime: 'bg-orange-100 text-orange-700',
  inactivity: 'bg-red-100 text-red-700',
  high_non_productive: 'bg-purple-100 text-purple-700',
}

interface FormState {
  name: string
  rule_type: 'low_productivity' | 'overtime' | 'inactivity' | 'high_non_productive'
  threshold_value: string
  consecutive_days: string
  notify_manager: boolean
  notify_admin: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  rule_type: 'low_productivity',
  threshold_value: '40',
  consecutive_days: '1',
  notify_manager: true,
  notify_admin: true,
}

export function AlertRulesManager() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [evalDate, setEvalDate] = useState(
    new Date(Date.now() - 86400000).toISOString().slice(0, 10),
  )

  const { data: rules, isLoading, refetch } = trpc.notifications.listAlertRules.useQuery()

  const create = trpc.notifications.createAlertRule.useMutation({
    onSuccess: () => {
      setShowForm(false)
      setForm(EMPTY_FORM)
      void refetch()
    },
  })
  const remove = trpc.notifications.deleteAlertRule.useMutation({ onSuccess: () => void refetch() })
  const toggle = trpc.notifications.updateAlertRule.useMutation({ onSuccess: () => void refetch() })
  const evalAlerts = trpc.notifications.triggerAlertEvaluation.useMutation()

  function handleCreate() {
    const threshold = parseFloat(form.threshold_value)
    const days = parseInt(form.consecutive_days, 10)
    if (!form.name || isNaN(threshold) || isNaN(days)) return
    create.mutate({
      name: form.name,
      rule_type: form.rule_type,
      threshold_value: threshold,
      consecutive_days: days,
      notify_manager: form.notify_manager,
      notify_admin: form.notify_admin,
    })
  }

  return (
    <div className="space-y-5">
      {/* Barra de acciones */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Reglas de alerta</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1">
            <label className="text-xs text-gray-500">Evaluar al:</label>
            <input
              type="date"
              value={evalDate}
              onChange={(e) => setEvalDate(e.target.value)}
              className="border-none bg-transparent text-xs text-gray-700 outline-none"
            />
            <button
              type="button"
              onClick={() => evalAlerts.mutate({ date: evalDate })}
              disabled={evalAlerts.isPending}
              className="flex items-center gap-1 rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Zap className="h-3 w-3" />
              {evalAlerts.isPending ? 'Evaluando…' : 'Evaluar'}
            </button>
          </div>
          {evalAlerts.isSuccess && (
            <span className="text-xs text-green-600">
              {evalAlerts.data.notifications_created} notificaciones creadas
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva regla
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-3 text-xs font-semibold text-blue-700">Nueva regla de alerta</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Productividad crítica"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tipo de regla</label>
              <select
                value={form.rule_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rule_type: e.target.value as FormState['rule_type'] }))
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              >
                {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Umbral{' '}
                <span className="font-normal text-gray-400">
                  — {RULE_TYPE_HINT[form.rule_type]}
                </span>
              </label>
              <input
                type="number"
                value={form.threshold_value}
                onChange={(e) => setForm((f) => ({ ...f, threshold_value: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Días consecutivos
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={form.consecutive_days}
                onChange={(e) => setForm((f) => ({ ...f, consecutive_days: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.notify_manager}
                onChange={(e) => setForm((f) => ({ ...f, notify_manager: e.target.checked }))}
              />
              Notificar managers
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={form.notify_admin}
                onChange={(e) => setForm((f) => ({ ...f, notify_admin: e.target.checked }))}
              />
              Notificar admins
            </label>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setForm(EMPTY_FORM)
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={create.isPending}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {create.isPending ? 'Guardando…' : 'Guardar regla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de reglas */}
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
      ) : (rules ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12">
          <Zap className="mb-2 h-8 w-8 text-gray-200" />
          <p className="text-sm text-gray-400">Sin reglas configuradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(rules ?? []).map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center justify-between rounded-xl border bg-white px-4 py-3 ${rule.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[rule.rule_type]}`}
                >
                  {RULE_TYPE_LABELS[rule.rule_type]}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{rule.name}</p>
                  <p className="text-xs text-gray-400">
                    Umbral: {String(rule.threshold_value)} · {rule.consecutive_days} día(s)
                    {rule.notify_manager && ' · notifica managers'}
                    {rule.notify_admin && ' · notifica admins'}
                    {' · '}
                    {formatDate(rule.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggle.mutate({ id: rule.id, is_active: !rule.is_active })}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
                  title={rule.is_active ? 'Desactivar' : 'Activar'}
                >
                  {rule.is_active ? (
                    <ToggleRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Eliminar esta regla?')) remove.mutate({ id: rule.id })
                  }}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
