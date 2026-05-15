'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Mail, Phone, Users, FileText, Plus, Send, Check } from 'lucide-react'

const CHANNEL_CONFIG = {
  email: { label: 'Email', icon: Mail, color: 'text-blue-500 bg-blue-50' },
  call: { label: 'Llamada', icon: Phone, color: 'text-green-500 bg-green-50' },
  meeting: { label: 'Reunión', icon: Users, color: 'text-violet-500 bg-violet-50' },
  note: { label: 'Nota', icon: FileText, color: 'text-gray-500 bg-gray-100' },
} as const

type Channel = keyof typeof CHANNEL_CONFIG

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function CommunicationHistory({ tenantId }: { tenantId: string }) {
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: '', body: '', channel: 'note' as Channel })
  const [saved, setSaved] = useState(false)

  const { data: comms, isLoading } = trpc.platform.getTenantCommunications.useQuery({ tenantId })

  const log = trpc.platform.logCommunication.useMutation({
    onSuccess: () => {
      utils.platform.getTenantCommunications.invalidate({ tenantId })
      setForm({ subject: '', body: '', channel: 'note' })
      setShowForm(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Historial de comunicaciones</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Registrar
        </button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex gap-2">
            {(Object.keys(CHANNEL_CONFIG) as Channel[]).map((ch) => {
              const cfg = CHANNEL_CONFIG[ch]
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, channel: ch }))}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${form.channel === ch ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <cfg.icon className="h-3 w-3" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
          <input
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Asunto / título corto"
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Descripción, notas, resultado de la llamada..."
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={log.isPending || !form.subject.trim()}
              onClick={() => log.mutate({ tenantId, ...form })}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              {log.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          <Check className="h-3.5 w-3.5" />
          Comunicación registrada
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && (!comms || comms.length === 0) && (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400">Sin comunicaciones registradas</p>
          <p className="mt-1 text-xs text-gray-300">
            Los emails enviados aparecerán aquí automáticamente
          </p>
        </div>
      )}

      {!isLoading && comms && comms.length > 0 && (
        <div className="space-y-1">
          {comms.map((c) => {
            const ch = CHANNEL_CONFIG[c.channel as Channel] ?? CHANNEL_CONFIG.note
            const Icon = ch.icon
            return (
              <div key={c.id} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ch.color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-800">{c.subject}</p>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatRelative(c.sent_at)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-gray-500">{c.body}</p>
                  <p className="mt-0.5 text-xs text-gray-300">
                    {c.sent_by} · {ch.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
