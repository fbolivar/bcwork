'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Heart, Send, Star, Lightbulb, Trophy, Users, HelpingHand, Sparkles, X } from 'lucide-react'

type KudosValue = 'teamwork' | 'innovation' | 'excellence' | 'leadership' | 'helpfulness' | 'other'

const VALUE_DEFS: {
  value: KudosValue
  label: string
  icon: React.ReactNode
  color: string
  bg: string
}[] = [
  {
    value: 'teamwork',
    label: 'Trabajo en equipo',
    icon: <Users className="h-4 w-4" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  {
    value: 'innovation',
    label: 'Innovación',
    icon: <Lightbulb className="h-4 w-4" />,
    color: 'text-yellow-700',
    bg: 'bg-yellow-50 border-yellow-200',
  },
  {
    value: 'excellence',
    label: 'Excelencia',
    icon: <Trophy className="h-4 w-4" />,
    color: 'text-orange-700',
    bg: 'bg-orange-50 border-orange-200',
  },
  {
    value: 'leadership',
    label: 'Liderazgo',
    icon: <Star className="h-4 w-4" />,
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
  },
  {
    value: 'helpfulness',
    label: 'Apoyo',
    icon: <HelpingHand className="h-4 w-4" />,
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
  },
  {
    value: 'other',
    label: 'Otro',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200',
  },
]

const VALUE_MAP = Object.fromEntries(VALUE_DEFS.map((v) => [v.value, v])) as Record<
  KudosValue,
  (typeof VALUE_DEFS)[0]
>

function fmtAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `Hace ${days}d`
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function KudosPanel() {
  const utils = trpc.useUtils()
  const [showModal, setShowModal] = useState(false)
  const [toUserId, setToUserId] = useState('')
  const [message, setMessage] = useState('')
  const [kudosValue, setKudosValue] = useState<KudosValue>('teamwork')
  const [tab, setTab] = useState<'feed' | 'received'>('feed')

  const { data: feed } = trpc.employee.getKudosFeed.useQuery({ limit: 50 })
  const { data: received } = trpc.employee.getMyKudosReceived.useQuery()
  const { data: presence } = trpc.employee.getTeamPresence.useQuery()

  const send = trpc.employee.sendKudos.useMutation({
    onSuccess: () => {
      utils.employee.getKudosFeed.invalidate()
      utils.employee.getMyKudosReceived.invalidate()
      setShowModal(false)
      setToUserId('')
      setMessage('')
      setKudosValue('teamwork')
    },
  })

  const teammates = presence ?? []

  const displayFeed = tab === 'feed' ? (feed ?? []) : (received ?? [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reconocimiento</h1>
          <p className="mt-0.5 text-sm text-gray-500">Celebra los logros de tu equipo</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600"
        >
          <Heart className="h-4 w-4" />
          Enviar kudos
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl border border-pink-100 bg-pink-50 px-4 py-3">
          <p className="text-xs text-pink-600">Recibidos</p>
          <p className="mt-0.5 text-2xl font-bold text-pink-700">{(received ?? []).length}</p>
        </div>
        <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500">En el feed</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-700">{(feed ?? []).length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {(['feed', 'received'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-pink-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {t === 'feed' ? 'Feed del equipo' : 'Mis reconocimientos'}
          </button>
        ))}
      </div>

      {/* Feed */}
      {displayFeed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <Heart className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">
            {tab === 'received' ? 'Aún no has recibido kudos' : 'El feed está vacío'}
          </p>
          <p className="mt-1 text-xs text-gray-400">¡Sé el primero en reconocer a alguien!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayFeed.map((k) => {
            const valDef = VALUE_MAP[k.value as KudosValue]
            const fromUser = (k as { from_user?: { id: string; full_name: string } | null })
              .from_user
            const toUser = (k as { to_user?: { id: string; full_name: string } | null }).to_user
            return (
              <div key={k.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-semibold text-pink-700">
                    {(fromUser?.full_name ?? 'U')[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">{fromUser?.full_name}</span>
                      {' reconoció a '}
                      <span className="font-semibold text-gray-900">{toUser?.full_name}</span>
                    </p>
                    <p className="mt-1 text-sm italic text-gray-600">"{k.message}"</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${valDef?.bg ?? ''} ${valDef?.color ?? ''}`}
                      >
                        {valDef?.icon}
                        {valDef?.label}
                      </span>
                      <span className="text-xs text-gray-400">{fmtAgo(k.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Send modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Enviar kudos</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Recipient */}
              <div>
                <label className="text-xs font-medium text-gray-700">¿A quién reconoces?</label>
                <select
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Selecciona un compañero...</option>
                  {teammates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value */}
              <div>
                <label className="text-xs font-medium text-gray-700">Valor que demuestra</label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {VALUE_DEFS.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setKudosValue(v.value)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${kudosValue === v.value ? v.bg + ' ' + v.color + ' border-current' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      {v.icon}
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-medium text-gray-700">Mensaje</label>
                <textarea
                  rows={3}
                  placeholder="Describe por qué merece este reconocimiento..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!toUserId || !message.trim() || send.isPending}
                onClick={() => send.mutate({ to_user_id: toUserId, message, value: kudosValue })}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-pink-500 py-2 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
