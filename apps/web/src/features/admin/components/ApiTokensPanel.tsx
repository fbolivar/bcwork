'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, Copy, Trash2, Check } from 'lucide-react'
import { formatDate } from '@/lib/format'

const ALL_SCOPES = [
  { value: 'payroll:read', label: 'Nómina — leer horas trabajadas' },
  { value: 'users:read', label: 'Usuarios — listar empleados' },
  { value: 'metrics:read', label: 'Métricas — productividad' },
  { value: 'sessions:read', label: 'Sesiones — actividad en vivo' },
] as const

type Scope = (typeof ALL_SCOPES)[number]['value']

interface NewTokenState {
  name: string
  scopes: Scope[]
  expires_days: string
}

export function ApiTokensPanel() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewTokenState>({
    name: '',
    scopes: ['payroll:read'],
    expires_days: '365',
  })
  const [revealedToken, setRevealedToken] = useState<{ id: string; raw: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: tokens, isLoading, refetch } = trpc.integrations.listApiTokens.useQuery()
  const create = trpc.integrations.createApiToken.useMutation({
    onSuccess: (data) => {
      setRevealedToken({ id: data.id, raw: data.raw_token })
      setShowForm(false)
      setForm({ name: '', scopes: ['payroll:read'], expires_days: '365' })
      void refetch()
    },
  })
  const revoke = trpc.integrations.revokeApiToken.useMutation({ onSuccess: () => void refetch() })

  function toggleScope(scope: Scope) {
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope],
    }))
  }

  async function copyToken() {
    if (!revealedToken) return
    await navigator.clipboard.writeText(revealedToken.raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeTokens = (tokens ?? []).filter((t) => !t.revoked_at)
  const revokedTokens = (tokens ?? []).filter((t) => t.revoked_at)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Tokens de API</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" /> Nuevo token
        </button>
      </div>

      {/* Token revelado tras creación */}
      {revealedToken && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-xs font-semibold text-green-700">
            Token creado — cópialo ahora, no se mostrará de nuevo
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-white px-3 py-2">
            <code className="flex-1 break-all text-xs text-gray-700">{revealedToken.raw}</code>
            <button type="button" onClick={copyToken} className="shrink-0 text-green-600">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRevealedToken(null)}
            className="mt-2 text-xs text-green-600 underline"
          >
            Ya lo copié
          </button>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-3 text-xs font-semibold text-blue-700">Nuevo token de API</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Integración SAP RRHH"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Expiración (días)
              </label>
              <input
                type="number"
                min={1}
                max={3650}
                value={form.expires_days}
                onChange={(e) => setForm((f) => ({ ...f, expires_days: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-2 block text-xs font-medium text-gray-600">
              Permisos (scopes)
            </label>
            <div className="space-y-1.5">
              {ALL_SCOPES.map((s) => (
                <label key={s.value} className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.scopes.includes(s.value)}
                    onChange={() => toggleScope(s.value)}
                  />
                  <code className="rounded bg-gray-100 px-1 text-[10px]">{s.value}</code>
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!form.name || form.scopes.length === 0 || create.isPending}
              onClick={() =>
                create.mutate({
                  name: form.name,
                  scopes: form.scopes,
                  expires_days: parseInt(form.expires_days, 10),
                })
              }
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {create.isPending ? 'Generando…' : 'Generar token'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de tokens */}
      {isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
      ) : activeTokens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
          Sin tokens activos
        </p>
      ) : (
        <div className="space-y-2">
          {activeTokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{t.name}</p>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {(t.scopes as string[]).map((s) => (
                    <code
                      key={s}
                      className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600"
                    >
                      {s}
                    </code>
                  ))}
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  Creado {formatDate(t.created_at)}
                  {t.last_used_at && ` · Último uso: ${formatDate(t.last_used_at)}`}
                  {t.expires_at && ` · Expira: ${formatDate(t.expires_at)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('¿Revocar este token? No se puede deshacer.'))
                    revoke.mutate({ id: t.id })
                }}
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {revokedTokens.length > 0 && (
            <p className="text-xs text-gray-400">
              {revokedTokens.length} token(s) revocado(s) ocultos
            </p>
          )}
        </div>
      )}

      {/* Referencia de la API */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600">
        <p className="mb-2 font-semibold text-gray-700">Endpoints disponibles</p>
        <div className="space-y-1 font-mono">
          <p>
            <span className="text-green-600">GET</span>{' '}
            /api/v1/payroll?from=YYYY-MM-DD&to=YYYY-MM-DD[&format=csv]
          </p>
          <p>
            <span className="text-green-600">GET</span>{' '}
            /api/v1/users[?status=active&page=1&pageSize=50]
          </p>
          <p>
            <span className="text-green-600">GET</span>{' '}
            /api/v1/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD[&groupBy=day|user]
          </p>
        </div>
        <p className="mt-2 text-gray-500">
          Autenticación:{' '}
          <code>
            Authorization: Bearer {'<'}token{'>'}
          </code>
        </p>
      </div>
    </div>
  )
}
