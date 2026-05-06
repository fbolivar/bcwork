'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { X, Save, Trash2, Plus, ExternalLink, CheckCircle, XCircle } from 'lucide-react'

const INTEGRATION_DEFS = {
  slack: {
    label: 'Slack',
    description:
      'Recibe notificaciones de aprobaciones, alertas y resúmenes diarios en tu workspace.',
    color: 'bg-purple-100',
    textColor: 'text-purple-700',
    fields: [
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        type: 'url',
        placeholder: 'https://hooks.slack.com/services/...',
      },
    ],
    docsUrl: 'https://api.slack.com/messaging/webhooks',
  },
  jira: {
    label: 'Jira',
    description: 'Sincroniza proyectos y tareas de Jira como proyectos en BCWork.',
    color: 'bg-blue-100',
    textColor: 'text-blue-700',
    fields: [
      {
        key: 'base_url',
        label: 'URL de Jira',
        type: 'url',
        placeholder: 'https://tu-empresa.atlassian.net',
      },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'admin@empresa.com' },
      { key: 'api_token', label: 'API Token', type: 'password', placeholder: '••••••••' },
    ],
    docsUrl:
      'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/',
  },
  asana: {
    label: 'Asana',
    description: 'Importa proyectos y tareas de Asana automáticamente.',
    color: 'bg-pink-100',
    textColor: 'text-pink-700',
    fields: [
      {
        key: 'access_token',
        label: 'Personal Access Token',
        type: 'password',
        placeholder: '1/••••••••',
      },
    ],
    docsUrl: 'https://developers.asana.com/docs/personal-access-token',
  },
  github: {
    label: 'GitHub',
    description: 'Registra commits y pull requests como actividad productiva.',
    color: 'bg-gray-100',
    textColor: 'text-gray-700',
    fields: [
      {
        key: 'access_token',
        label: 'Personal Access Token',
        type: 'password',
        placeholder: 'ghp_••••••••',
      },
      { key: 'org', label: 'Organización (opcional)', type: 'text', placeholder: 'mi-empresa' },
    ],
    docsUrl:
      'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
  },
  trello: {
    label: 'Trello',
    description: 'Sincroniza tableros y tarjetas de Trello como tareas.',
    color: 'bg-cyan-100',
    textColor: 'text-cyan-700',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: '••••••••' },
      { key: 'token', label: 'Token', type: 'password', placeholder: '••••••••' },
    ],
    docsUrl: 'https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/',
  },
  webhook: {
    label: 'Webhook genérico',
    description: 'Envía eventos de BCWork a cualquier URL externa vía POST.',
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
    fields: [
      {
        key: 'url',
        label: 'URL del webhook',
        type: 'url',
        placeholder: 'https://tuapp.com/webhook',
      },
      {
        key: 'secret',
        label: 'Secreto (opcional)',
        type: 'password',
        placeholder: 'para validar la firma',
      },
    ],
    docsUrl: '',
  },
} as const

type IntegrationType = keyof typeof INTEGRATION_DEFS

function IntegrationForm({
  type,
  existing,
  onClose,
}: {
  type: IntegrationType
  existing?: { id: string; config: Record<string, string>; active: boolean; label: string | null }
  onClose: () => void
}) {
  const utils = trpc.useUtils()
  const def = INTEGRATION_DEFS[type]
  const [config, setConfig] = useState<Record<string, string>>(
    existing?.config
      ? (existing.config as Record<string, string>)
      : Object.fromEntries(def.fields.map((f) => [f.key, ''])),
  )
  const [active, setActive] = useState(existing?.active ?? true)
  const [label, setLabel] = useState(existing?.label ?? '')
  const [error, setError] = useState('')

  const save = trpc.admin.saveIntegration.useMutation({
    onSuccess: () => {
      void utils.admin.getIntegrations.invalidate()
      onClose()
    },
    onError: (e) => setError(e.message),
  })

  const del = trpc.admin.deleteIntegration.useMutation({
    onSuccess: () => {
      void utils.admin.getIntegrations.invalidate()
      onClose()
    },
  })

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    save.mutate({ type, label: label.trim() || undefined, config, active })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Configurar {def.label}</h3>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">{def.description}</p>
        {def.docsUrl && (
          <a
            href={def.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Ver documentación
          </a>
        )}
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <div>
            <label htmlFor="int-label" className="text-xs font-medium text-gray-700">
              Etiqueta (opcional)
            </label>
            <input
              id="int-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
              placeholder={`Mi ${def.label}`}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {def.fields.map((field) => (
            <div key={field.key}>
              <label htmlFor={`int-${field.key}`} className="text-xs font-medium text-gray-700">
                {field.label}
              </label>
              <input
                id={`int-${field.key}`}
                type={field.type}
                value={config[field.key] ?? ''}
                placeholder={field.placeholder}
                onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <label htmlFor="int-active" className="text-xs font-medium text-gray-700">
              Activa
            </label>
            <button
              type="button"
              id="int-active"
              onClick={() => setActive((a) => !a)}
              className={`relative h-5 w-9 rounded-full transition-colors ${active ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            {existing && (
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => del.mutate({ id: existing.id })}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {save.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function IntegrationsManager() {
  const [configuring, setConfiguring] = useState<IntegrationType | null>(null)
  const { data: integrations, isLoading } = trpc.admin.getIntegrations.useQuery()

  type SavedInt = {
    id: string
    type: string
    config: Record<string, string>
    active: boolean
    label: string | null
  }
  const intMap = new Map<string, SavedInt>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const raw of (integrations ?? []) as any[]) {
    const i = raw as SavedInt
    intMap.set(i.type, i)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Integraciones</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Conecta BCWork con tus herramientas de trabajo
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            Object.entries(INTEGRATION_DEFS) as [
              IntegrationType,
              (typeof INTEGRATION_DEFS)[IntegrationType],
            ][]
          ).map(([type, def]) => {
            const existing = intMap.get(type)
            const isActive = !!existing?.active
            const isConfigured = !!existing

            return (
              <div
                key={type}
                className={`rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm ${isConfigured ? 'border-blue-200' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${def.color}`}
                  >
                    <span className={`text-sm font-bold ${def.textColor}`}>{def.label[0]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{def.label}</p>
                      {isConfigured &&
                        (isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        ))}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{def.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfiguring(type)}
                  className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors ${isConfigured ? 'border-blue-200 text-blue-700 hover:bg-blue-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {isConfigured ? (
                    <>
                      <Save className="h-3.5 w-3.5" /> Configurar
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Conectar
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {configuring && (
        <IntegrationForm
          type={configuring}
          existing={
            intMap.get(configuring) as
              | {
                  id: string
                  config: Record<string, string>
                  active: boolean
                  label: string | null
                }
              | undefined
          }
          onClose={() => setConfiguring(null)}
        />
      )}
    </div>
  )
}
