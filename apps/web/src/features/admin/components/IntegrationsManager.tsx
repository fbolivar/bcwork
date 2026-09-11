'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { X, Save, Trash2, ExternalLink, CheckCircle, Zap } from 'lucide-react'

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
    description:
      'Seguimiento de incidencias y gestión de proyectos de Atlassian. Guardá las credenciales para vincular tus proyectos de Jira.',
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
    description:
      'Aplicación web y móvil para organizar, seguir y gestionar el trabajo en equipo. Guardá el token para vincular tus proyectos de Asana.',
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
    description:
      'Tableros visuales para gestionar proyectos y organizar cualquier cosa. Guardá la clave para vincular tus tableros de Trello.',
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
  teams: {
    label: 'Microsoft Teams',
    description: 'Recibe alertas y notificaciones críticas en canales de Teams.',
    color: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    fields: [
      {
        key: 'webhook_url',
        label: 'Incoming Webhook URL',
        type: 'url',
        placeholder: 'https://outlook.office.com/webhook/...',
      },
    ],
    docsUrl:
      'https://learn.microsoft.com/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
  },
  whatsapp: {
    label: 'WhatsApp Business',
    description: 'Envía alertas críticas al teléfono del administrador vía WhatsApp.',
    color: 'bg-green-100',
    textColor: 'text-green-700',
    fields: [
      {
        key: 'phone_number_id',
        label: 'Phone Number ID',
        type: 'text',
        placeholder: '123456789012345',
      },
      {
        key: 'access_token',
        label: 'Access Token (Meta)',
        type: 'password',
        placeholder: 'EAABs...',
      },
      {
        key: 'to_phone',
        label: 'Teléfono destino (con código de país)',
        type: 'text',
        placeholder: '573001234567',
      },
    ],
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
  },
  google_calendar: {
    label: 'Google Calendar',
    description: 'Importa eventos (vacaciones, festivos) como ausencias automáticamente.',
    color: 'bg-red-100',
    textColor: 'text-red-700',
    fields: [
      {
        key: 'calendar_id',
        label: 'Calendar ID',
        type: 'text',
        placeholder: 'correo@group.calendar.google.com',
      },
      {
        key: 'api_key',
        label: 'Google API Key',
        type: 'password',
        placeholder: 'AIzaSy...',
      },
    ],
    docsUrl: 'https://developers.google.com/calendar/api/guides/auth',
  },
  outlook_calendar: {
    label: 'Calendario de Outlook',
    description:
      'Conectá tu calendario para sincronizar reuniones, ausencias y otros eventos entre Outlook y BCWork.',
    color: 'bg-sky-100',
    textColor: 'text-sky-700',
    fields: [
      {
        key: 'ics_url',
        label: 'URL ICS publicada',
        type: 'url',
        placeholder: 'https://outlook.office365.com/owa/calendar/.../calendar.ics',
      },
    ],
    docsUrl:
      'https://support.microsoft.com/office/share-your-calendar-in-outlook-on-the-web-7ecef8ae-139c-40d9-bae2-a23977ee58d5',
  },
  gitlab: {
    label: 'GitLab',
    description:
      'Gestor de repositorios Git con wiki, seguimiento de incidencias y CI/CD. Vincula issues y merge requests como tareas.',
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
    fields: [
      { key: 'base_url', label: 'URL de GitLab', type: 'url', placeholder: 'https://gitlab.com' },
      { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'glpat-…' },
    ],
    docsUrl: 'https://docs.gitlab.com/user/profile/personal_access_tokens/',
  },
  zapier: {
    label: 'Zapier',
    description:
      'Automatización web: con un Zap conectás BCWork a cientos de aplicaciones sin programar. Cada evento se envía a tu Catch Hook.',
    color: 'bg-amber-100',
    textColor: 'text-amber-700',
    fields: [
      {
        key: 'webhook_url',
        label: 'URL del Catch Hook de Zapier',
        type: 'url',
        placeholder: 'https://hooks.zapier.com/hooks/catch/…',
      },
    ],
    docsUrl: 'https://zapier.com/apps/webhook/integrations',
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

/**
 * Dos grupos, como las herramientas del mercado: lo que conecta cada persona
 * (sus calendarios) y lo que conecta la empresa (gestores de proyectos,
 * mensajería, automatización). Misma tarjeta para todos: logo, nombre,
 * descripción, "Configurar" y un solo botón de Activar / Desactivar.
 */
const GRUPOS: { titulo: string; tipos: IntegrationType[] }[] = [
  { titulo: 'Integraciones de usuarios', tipos: ['google_calendar', 'outlook_calendar'] },
  {
    titulo: 'Integraciones de la empresa',
    tipos: [
      'asana',
      'jira',
      'trello',
      'gitlab',
      'zapier',
      'slack',
      'teams',
      'whatsapp',
      'github',
      'webhook',
    ],
  },
]

const SIN_PRUEBA: IntegrationType[] = ['jira', 'asana', 'github', 'trello']

export function IntegrationsManager() {
  const utils = trpc.useUtils()
  const [configuring, setConfiguring] = useState<IntegrationType | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; detail?: string } | null>(
    null,
  )
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ id: string; detail: string } | null>(null)
  const { data: integrations, isLoading } = trpc.admin.getIntegrations.useQuery()

  const guardar = trpc.admin.saveIntegration.useMutation({
    onSuccess: () => void utils.admin.getIntegrations.invalidate(),
  })

  const testIntegration = trpc.integrations.testIntegration.useMutation({
    onSuccess: (data, variables) => {
      setTestingId(null)
      setTestResult({ id: variables.id, ok: true, detail: data.detail })
      setTimeout(() => setTestResult(null), 5000)
    },
    onError: (err, variables) => {
      setTestingId(null)
      setTestResult({ id: variables.id, ok: false, detail: err.message })
      setTimeout(() => setTestResult(null), 6000)
    },
  })

  const syncCalendar = trpc.integrations.syncGoogleCalendar.useMutation({
    onSuccess: (data, variables) => {
      setSyncingId(null)
      setSyncResult({ id: variables.id, detail: `${data.absences_created} ausencias creadas` })
      setTimeout(() => setSyncResult(null), 5000)
    },
    onError: (err, variables) => {
      setSyncingId(null)
      setSyncResult({ id: variables.id, detail: err.message })
      setTimeout(() => setSyncResult(null), 6000)
    },
  })

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

  function alternar(type: IntegrationType, existing: SavedInt | undefined) {
    if (!existing) {
      setConfiguring(type) // sin credenciales no hay nada que activar
      return
    }
    guardar.mutate({
      type,
      label: existing.label ?? undefined,
      config: existing.config,
      active: !existing.active,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Integraciones</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Conectá BCWork con las herramientas que ya usa tu empresa
        </p>
      </div>

      {isLoading ? (
        <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        GRUPOS.map((g) => (
          <section key={g.titulo} className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">{g.titulo}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {g.tipos.map((type) => {
                const def = INTEGRATION_DEFS[type]
                const existing = intMap.get(type)
                const activa = !!existing?.active
                const esZapier = type === 'zapier'
                return (
                  <div
                    key={type}
                    className={`flex flex-col rounded-xl border bg-white p-5 ${activa ? 'border-blue-200' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${def.color}`}
                      >
                        <span className={`text-lg font-bold ${def.textColor}`}>{def.label[0]}</span>
                      </div>
                      {activa && (
                        <CheckCircle className="h-4 w-4 text-green-500" aria-label="Activa" />
                      )}
                    </div>
                    <p className="mt-4 text-base font-semibold text-gray-900">{def.label}</p>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-600">
                      {def.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <button
                        type="button"
                        onClick={() => setConfiguring(type)}
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        Configurar <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      {existing && !SIN_PRUEBA.includes(type) && (
                        <button
                          type="button"
                          disabled={testingId === existing.id}
                          onClick={() => {
                            setTestingId(existing.id)
                            testIntegration.mutate({ id: existing.id })
                          }}
                          className={`flex items-center gap-1 ${
                            testResult?.id === existing.id
                              ? testResult.ok
                                ? 'text-green-600'
                                : 'text-red-600'
                              : 'text-gray-500 hover:underline'
                          }`}
                          title={
                            testResult?.id === existing.id ? testResult.detail : 'Probar conexión'
                          }
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {testingId === existing.id
                            ? 'Probando…'
                            : testResult?.id === existing.id
                              ? testResult.ok
                                ? (testResult.detail ?? 'OK')
                                : 'Error'
                              : 'Probar'}
                        </button>
                      )}
                      {existing && type === 'google_calendar' && (
                        <button
                          type="button"
                          disabled={syncingId === existing.id}
                          onClick={() => {
                            setSyncingId(existing.id)
                            syncCalendar.mutate({ id: existing.id })
                          }}
                          className="text-gray-500 hover:underline"
                        >
                          {syncingId === existing.id
                            ? 'Sincronizando…'
                            : syncResult?.id === existing.id
                              ? syncResult.detail
                              : 'Sincronizar'}
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => alternar(type, existing)}
                      disabled={guardar.isPending}
                      className={`mt-4 w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                        activa
                          ? 'border border-red-200 text-red-600 hover:bg-red-50'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {activa ? 'Desactivar' : esZapier && !existing ? 'Hacer un Zap' : 'Activar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ))
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
