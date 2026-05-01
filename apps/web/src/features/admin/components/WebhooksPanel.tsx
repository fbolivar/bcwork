'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, Trash2, ToggleLeft, ToggleRight, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDate } from '@/lib/format'

const AVAILABLE_EVENTS = [
  { value: 'alert.fired', label: 'Alerta disparada' },
  { value: 'session.started', label: 'Sesión iniciada' },
  { value: 'session.ended', label: 'Sesión terminada' },
  { value: 'device.enrolled', label: 'Dispositivo enrolado' },
  { value: 'device.revoked', label: 'Dispositivo revocado' },
  { value: 'test', label: 'Prueba' },
]

interface WebhookForm {
  name: string
  url: string
  secret: string
  events: string[]
}

const EMPTY: WebhookForm = { name: '', url: '', secret: '', events: [] }

export function WebhooksPanel() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<WebhookForm>(EMPTY)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: hooks, isLoading, refetch } = trpc.integrations.listWebhooks.useQuery()
  const { data: deliveries } = trpc.integrations.getWebhookDeliveries.useQuery(
    { webhookId: expanded!, limit: 10 },
    { enabled: !!expanded },
  )

  const create = trpc.integrations.createWebhook.useMutation({
    onSuccess: () => {
      setShowForm(false)
      setForm(EMPTY)
      void refetch()
    },
  })
  const remove = trpc.integrations.deleteWebhook.useMutation({ onSuccess: () => void refetch() })
  const toggle = trpc.integrations.updateWebhook.useMutation({ onSuccess: () => void refetch() })
  const test = trpc.integrations.testWebhook.useMutation()

  function toggleEvent(ev: string) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Webhooks</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" /> Nuevo webhook
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-3 text-xs font-semibold text-blue-700">Nuevo webhook</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Notificador Slack"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">URL</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://hooks.ejemplo.com/..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Secret HMAC{' '}
                <span className="font-normal text-gray-400">(opcional, para verificar firma)</span>
              </label>
              <input
                type="text"
                value={form.secret}
                onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                placeholder="min. 8 caracteres"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-2 block text-xs font-medium text-gray-600">
              Eventos <span className="font-normal text-gray-400">(ninguno = todos)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map((e) => (
                <label key={e.value} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.events.includes(e.value)}
                    onChange={() => toggleEvent(e.value)}
                  />
                  {e.label}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!form.name || !form.url || create.isPending}
              onClick={() =>
                create.mutate({
                  name: form.name,
                  url: form.url,
                  secret: form.secret || undefined,
                  events: form.events,
                })
              }
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {create.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
      ) : (hooks ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
          Sin webhooks configurados
        </p>
      ) : (
        <div className="space-y-2">
          {(hooks ?? []).map((h) => (
            <div key={h.id} className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{h.name}</p>
                    {h.last_status_code != null && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          h.last_status_code >= 200 && h.last_status_code < 300
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {h.last_status_code}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-400">{h.url}</p>
                  {h.last_called_at && (
                    <p className="text-xs text-gray-400">
                      Último envío: {formatDate(h.last_called_at)}
                    </p>
                  )}
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => test.mutate({ id: h.id })}
                    disabled={test.isPending}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
                    title="Enviar prueba"
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ id: h.id, is_active: !h.is_active })}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
                  >
                    {h.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
                  >
                    {expanded === h.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Eliminar este webhook?')) remove.mutate({ id: h.id })
                    }}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {expanded === h.id && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold text-gray-500">Últimas entregas</p>
                  {(deliveries ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400">Sin entregas registradas</p>
                  ) : (
                    <div className="space-y-1">
                      {(deliveries ?? []).map((d) => (
                        <div key={d.id} className="flex items-center gap-3 text-xs text-gray-600">
                          <span
                            className={`w-8 text-center font-mono font-bold ${
                              d.status_code && d.status_code < 300
                                ? 'text-green-600'
                                : 'text-red-500'
                            }`}
                          >
                            {d.status_code ?? '—'}
                          </span>
                          <span className="rounded bg-gray-100 px-1 font-mono">{d.event}</span>
                          {d.error && <span className="text-red-500">{d.error}</span>}
                          <span className="ml-auto text-gray-400">{formatDate(d.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
