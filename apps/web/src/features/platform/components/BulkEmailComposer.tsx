'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Mail, Send, Users, Filter, CheckCircle, AlertCircle, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspendidos' },
  { value: 'cancelled', label: 'Cancelados' },
]

type Status = 'active' | 'trial' | 'suspended' | 'cancelled'

export function BulkEmailComposer() {
  const utils = trpc.useUtils()
  const [statusFilter, setStatusFilter] = useState<Status | ''>('')
  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null)

  const { data: targets, isLoading: loadingTargets } = trpc.platform.getBulkEmailTargets.useQuery({
    status: statusFilter || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  })

  const { data: allTags } = trpc.platform.getAllTags.useQuery()

  const send = trpc.platform.sendBulkEmail.useMutation({
    onSuccess: (data) => {
      setResult(data)
      setSubject('')
      setBody('')
      utils.platform.getBulkEmailTargets.invalidate()
    },
  })

  function addTag(tag: string) {
    const clean = tag.trim().toLowerCase()
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags((p) => [...p, clean])
    }
    setTagInput('')
  }

  const recipients = targets ?? []
  const canSend = subject.trim().length >= 2 && body.trim().length >= 10 && recipients.length > 0

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Filtrar destinatarios</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status | '')}
            aria-label="Filtrar por estado"
            title="Filtrar por estado"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            {selectedTags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
              >
                {t}
                <button
                  type="button"
                  title={`Quitar etiqueta ${t}`}
                  aria-label={`Quitar etiqueta ${t}`}
                  onClick={() => setSelectedTags((p) => p.filter((x) => x !== t))}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <div className="relative">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag(tagInput)
                  }
                }}
                placeholder="Filtrar por etiqueta…"
                list="tag-list"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="tag-list">
                {(allTags ?? [])
                  .filter((t) => !selectedTags.includes(t))
                  .map((t) => (
                    <option key={t} value={t} />
                  ))}
              </datalist>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {loadingTargets ? (
            <span className="text-xs text-gray-400">Calculando…</span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4 text-blue-500" />
              {recipients.length} destinatarios seleccionados
            </span>
          )}
        </div>

        {recipients.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recipients.slice(0, 10).map((r) => (
              <span
                key={r.id}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
              >
                {r.name}
              </span>
            ))}
            {recipients.length > 10 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                +{recipients.length - 10} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Composición */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Redactar email</h3>
        </div>
        <div className="space-y-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto del email"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Cuerpo del email (texto plano, saltos de línea serán respetados)…"
            rows={8}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {result && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Enviado: {result.sent} exitosos, {result.failed} fallidos de {result.total}{' '}
            destinatarios.
          </div>
        )}

        {send.isError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Error al enviar. Intenta de nuevo.
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!canSend || send.isPending}
            onClick={() =>
              send.mutate({
                tenantIds: recipients.map((r) => r.id),
                subject,
                body,
              })
            }
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {send.isPending ? 'Enviando…' : `Enviar a ${recipients.length} empresas`}
          </button>
        </div>
      </div>
    </div>
  )
}
