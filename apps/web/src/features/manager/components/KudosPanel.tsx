'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Heart, Plus, X, Award } from 'lucide-react'

const VALUES = [
  { id: 'excellence', label: '⭐ Excelencia', desc: 'Trabajo excepcional' },
  { id: 'teamwork', label: '🤝 Trabajo en equipo', desc: 'Colaboración y apoyo' },
  { id: 'innovation', label: '💡 Innovación', desc: 'Ideas y soluciones creativas' },
  { id: 'leadership', label: '🎯 Liderazgo', desc: 'Guía e iniciativa' },
  { id: 'reliability', label: '🔒 Confiabilidad', desc: 'Cumplimiento y responsabilidad' },
  { id: 'growth', label: '🌱 Crecimiento', desc: 'Aprendizaje continuo' },
]

const VALUE_COLORS: Record<string, string> = {
  excellence: 'bg-yellow-100 text-yellow-700',
  teamwork: 'bg-blue-100 text-blue-700',
  innovation: 'bg-purple-100 text-purple-700',
  leadership: 'bg-red-100 text-red-600',
  reliability: 'bg-green-100 text-green-700',
  growth: 'bg-emerald-100 text-emerald-700',
}

export function KudosPanel() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [toUserId, setToUserId] = useState('')
  const [value, setValue] = useState('excellence')
  const [message, setMessage] = useState('')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )

  const { data: kudos, isLoading } = trpc.manager.getTeamKudos.useQuery({ limit: 50 })
  const allKudos = (kudos ?? []) as any[]

  const send = trpc.manager.sendKudo.useMutation({
    onSuccess: () => {
      utils.manager.getTeamKudos.invalidate()
      setShowCreate(false)
      setToUserId('')
      setMessage('')
      setValue('excellence')
    },
  })

  // Group kudos by recipient for leaderboard
  const byRecipient: Record<string, number> = {}
  for (const k of allKudos) {
    byRecipient[k.to_name] = (byRecipient[k.to_name] ?? 0) + 1
  }
  const leaderboard = Object.entries(byRecipient)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reconocimientos</h2>
          <p className="mt-0.5 text-sm text-gray-500">Celebra los logros de tu equipo</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Enviar kudo
        </button>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="rounded-xl border border-yellow-100 bg-gradient-to-r from-yellow-50 to-orange-50 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-yellow-700">
            <Award className="h-3.5 w-3.5" /> Top reconocidos del equipo
          </p>
          <div className="space-y-1.5">
            {leaderboard.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-sm font-bold text-yellow-500">#{i + 1}</span>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-200 text-[10px] font-bold text-yellow-700">
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800">{name}</span>
                <span className="text-xs font-semibold text-yellow-600">
                  {count} {count === 1 ? 'kudo' : 'kudos'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allKudos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Aún no hay reconocimientos</p>
          <p className="mt-1 text-xs text-gray-400">¡Sé el primero en celebrar a tu equipo!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allKudos.map((k: any) => {
            const valConfig = VALUES.find((v) => v.id === k.value)
            return (
              <div key={k.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 text-sm font-bold text-white">
                    {k.from_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-800">{k.from_name}</span>
                      <span className="text-xs text-gray-400">→</span>
                      <span className="text-sm font-semibold text-blue-700">{k.to_name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          VALUE_COLORS[k.value] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {valConfig?.label ?? k.value}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{k.message}</p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {new Date(k.created_at).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Enviar reconocimiento</h3>
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
                <label className="text-xs font-medium text-gray-700">Para</label>
                <select
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar empleado...</option>
                  {(members ?? []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Valor reconocido</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {VALUES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setValue(v.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                        value === v.id
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium">{v.label}</p>
                      <p className="text-[10px] text-gray-400">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Mensaje</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Describe por qué merece este reconocimiento..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                disabled={!toUserId || !message.trim() || send.isPending}
                onClick={() => send.mutate({ to_user_id: toUserId, message, value })}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Enviar reconocimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
