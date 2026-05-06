'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Coffee, UtensilsCrossed, Pause, MoreHorizontal, StopCircle, Clock } from 'lucide-react'

const BREAK_TYPES = {
  lunch: { label: 'Almuerzo', icon: UtensilsCrossed, color: 'orange' },
  rest: { label: 'Descanso', icon: Coffee, color: 'blue' },
  personal: { label: 'Personal', icon: MoreHorizontal, color: 'purple' },
  other: { label: 'Otro', icon: Pause, color: 'gray' },
} as const

function fmtDuration(startedAt: string, endedAt?: string | null) {
  const end = endedAt ? new Date(endedAt) : new Date()
  const secs = Math.floor((end.getTime() - new Date(startedAt).getTime()) / 1000)
  const m = Math.floor(secs / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

function ActiveBreakBanner({
  break: b,
  onEnd,
}: {
  break: { id: string; type: string; started_at: string }
  onEnd: () => void
}) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const cfg = BREAK_TYPES[b.type as keyof typeof BREAK_TYPES] ?? BREAK_TYPES.other
  const Icon = cfg.icon

  return (
    <div className="flex items-center gap-4 rounded-xl border border-orange-100 bg-orange-50 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100">
        <Icon className="h-6 w-6 text-orange-600" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-orange-800">En pausa — {cfg.label}</p>
        <p className="text-sm text-orange-600">Iniciada hace {fmtDuration(b.started_at)}</p>
      </div>
      <button
        type="button"
        onClick={onEnd}
        className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
      >
        <StopCircle className="h-4 w-4" />
        Finalizar pausa
      </button>
    </div>
  )
}

export function MyBreaksPanel() {
  const utils = trpc.useUtils()
  const [note, setNote] = useState('')

  const { data: activeBreak, refetch: refetchActive } = trpc.employee.getActiveBreak.useQuery(
    undefined,
    { refetchInterval: 30000 },
  )
  const { data: history } = trpc.employee.getBreakHistory.useQuery({})

  const startBreak = trpc.employee.startBreak.useMutation({
    onSuccess: () => {
      void refetchActive()
      void utils.employee.getBreakHistory.invalidate()
      setNote('')
    },
  })

  const endBreak = trpc.employee.endBreak.useMutation({
    onSuccess: () => {
      void refetchActive()
      void utils.employee.getBreakHistory.invalidate()
    },
  })

  const todayTotal = (history ?? []).reduce((s, b) => {
    if (!b.ended_at) return s
    return s + (new Date(b.ended_at).getTime() - new Date(b.started_at).getTime()) / 1000 / 60
  }, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis pausas</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Registra tus descansos durante la jornada laboral
        </p>
      </div>

      {activeBreak ? (
        <ActiveBreakBanner break={activeBreak} onEnd={() => endBreak.mutate()} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-medium text-gray-700">Iniciar una pausa</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              Object.entries(BREAK_TYPES) as [
                keyof typeof BREAK_TYPES,
                (typeof BREAK_TYPES)[keyof typeof BREAK_TYPES],
              ][]
            ).map(([k, v]) => {
              const Icon = v.icon
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => startBreak.mutate({ type: k, note: note.trim() || undefined })}
                  disabled={startBreak.isPending}
                  className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 py-4 transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                >
                  <Icon className="h-6 w-6 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{v.label}</span>
                </button>
              )
            })}
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota opcional…"
            maxLength={200}
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {todayTotal > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <Clock className="h-4 w-4 text-gray-400" />
          <p className="text-sm text-gray-600">
            Total pausas hoy:{' '}
            <span className="font-semibold text-gray-900">{Math.round(todayTotal)}m</span>
          </p>
        </div>
      )}

      {history && history.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Historial de hoy</p>
          <div className="space-y-2">
            {history.map((b) => {
              const cfg = BREAK_TYPES[b.type as keyof typeof BREAK_TYPES] ?? BREAK_TYPES.other
              const Icon = cfg.icon
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{cfg.label}</p>
                    {b.note && <p className="text-xs text-gray-400">{b.note}</p>}
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(b.started_at).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {b.ended_at && ` · ${fmtDuration(b.started_at, b.ended_at)}`}
                    {!b.ended_at && <span className="ml-1 text-orange-500">activa</span>}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
