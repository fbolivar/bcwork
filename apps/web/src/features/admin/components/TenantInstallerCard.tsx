'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { formatDate } from '@/lib/format'
import { Download, ShieldCheck, Copy, Trash2, KeyRound, Loader2 } from 'lucide-react'

// Tarjeta "Instalador del tenant": genera un token de aprovisionamiento y
// descarga un instalador único (por-tenant) con ese token embebido. El PC se
// auto-enrola y la persona se elige una sola vez. Sin códigos.

function GeneratedInstallerModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const download = async () => {
    setDownloading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/installer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.message ?? j.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'BCWork-Agent.msi'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloading(false)
    }
  }

  const copyToken = async () => {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <h3 className="text-base font-semibold text-gray-900">Instalador generado</h3>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Descarga el instalador y ejecútalo (o empújalo por GPO/Intune) en los PC de tus
          colaboradores. El agente se instala como servicio, se auto-enrola y la persona se elige
          una sola vez.
        </p>

        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloading ? 'Preparando instalador...' : 'Descargar instalador (.msi)'}
        </button>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Este token de aprovisionamiento solo se muestra <strong>una vez</strong>. Guárdalo si vas
          a integrarlo en un despliegue automatizado; de lo contrario, basta con descargar el
          instalador ahora.
          <div className="mt-2 flex items-center justify-between rounded bg-white/70 px-2 py-1">
            <code className="truncate font-mono text-[11px] text-gray-600">{token}</code>
            <button onClick={copyToken} className="ml-2 shrink-0 text-gray-400 hover:text-gray-700">
              {copied ? 'Copiado' : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export function TenantInstallerCard() {
  const utils = trpc.useUtils()
  const { data: tokens } = trpc.admin.listProvisioningTokens.useQuery()
  const [generated, setGenerated] = useState<string | null>(null)

  const create = trpc.admin.createProvisioningToken.useMutation({
    onSuccess: (res) => {
      setGenerated(res.token)
      utils.admin.listProvisioningTokens.invalidate()
    },
  })
  const revoke = trpc.admin.revokeProvisioningToken.useMutation({
    onSuccess: () => utils.admin.listProvisioningTokens.invalidate(),
  })

  const active = (tokens ?? []).filter((t) => !t.revoked_at)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {generated && (
        <GeneratedInstallerModal token={generated} onClose={() => setGenerated(null)} />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Instalador del tenant</h2>
          </div>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Un solo instalador para toda tu empresa. Se instala como servicio de Windows (el
            empleado no puede apagarlo ni desinstalarlo sin permisos de administrador) y cada PC se
            auto-enrola sin códigos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => create.mutate({})}
          disabled={create.isPending}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {create.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          Generar instalador
        </button>
      </div>

      {create.error && (
        <p className="mt-3 text-xs text-red-600">
          {create.error.message === 'Sin permisos suficientes'
            ? 'Solo el administrador del tenant puede generar instaladores.'
            : create.error.message}
        </p>
      )}

      {active.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-medium text-gray-500">
            Tokens de aprovisionamiento activos
          </p>
          <div className="space-y-2">
            {active.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-mono text-xs text-gray-700">{t.token_prefix}…</span>
                  {t.label && <span className="ml-2 text-gray-500">{t.label}</span>}
                  <span className="ml-2 text-xs text-gray-400">
                    {t.provisioned_count ?? 0} PC · creado {formatDate(t.created_at ?? '')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm('¿Revocar este token? Los PC nuevos no podrán aprovisionarse con él.')
                    )
                      revoke.mutate({ id: t.id })
                  }}
                  disabled={revoke.isPending}
                  className="ml-3 flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> Revocar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
