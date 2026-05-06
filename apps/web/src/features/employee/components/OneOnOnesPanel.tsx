'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Users, Calendar, Clock, CheckCircle, X, Plus } from 'lucide-react'

type ActionItem = { text: string; done: boolean }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Programada', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completada', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500' },
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function OneOnOnesPanel() {
  const utils = trpc.useUtils()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all')

  const { data: meetings, isLoading } = trpc.employee.getMy1on1s.useQuery({ status: filter })

  const acknowledge = trpc.employee.acknowledge1on1.useMutation({
    onSuccess: () => {
      utils.employee.getMy1on1s.invalidate()
      setActiveId(null)
      setNotes('')
    },
  })

  const allMeetings = (meetings ?? []) as any[]
  const upcoming = allMeetings.filter(
    (m: any) => m.status === 'scheduled' && new Date(m.scheduled_at) > new Date(),
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Reuniones 1:1</h1>
        <p className="mt-0.5 text-sm text-gray-500">Sesiones de seguimiento con tu manager</p>
      </div>

      {!isLoading && upcoming.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">
            Próxima reunión:{' '}
            <span className="font-bold">
              {new Date(upcoming[0].scheduled_at).toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>{' '}
            con {upcoming[0].manager?.full_name}
          </p>
        </div>
      )}

      {!isLoading && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Programadas</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">
              {allMeetings.filter((m: any) => m.status === 'scheduled').length}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Realizadas</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">
              {allMeetings.filter((m: any) => m.status === 'completed').length}
            </p>
          </div>
        </div>
      )}

      <div className="flex w-fit self-start rounded-lg border border-gray-200 bg-white p-0.5">
        {(['all', 'scheduled', 'completed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {f === 'all' ? 'Todas' : f === 'scheduled' ? 'Próximas' : 'Completadas'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allMeetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <Users className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No hay reuniones programadas</p>
          <p className="mt-1 text-xs text-gray-400">Tu manager agendará sesiones de seguimiento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allMeetings.map((m: any) => {
            const st = STATUS_MAP[m.status] ?? STATUS_MAP.scheduled
            const actionItems = (m.action_items ?? []) as ActionItem[]
            const isActive = activeId === m.id
            return (
              <div key={m.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {m.manager ? initials(m.manager.full_name) : '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {m.manager?.full_name ?? '—'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(m.scheduled_at).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(m.scheduled_at).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          · {m.duration_minutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st?.color ?? 'bg-gray-100 text-gray-500'}`}
                  >
                    {st?.label ?? m.status}
                  </span>
                </div>

                {m.agenda && (
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <span className="font-medium">Agenda: </span>
                    {m.agenda}
                  </div>
                )}

                {m.notes && (
                  <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    <span className="font-medium">Notas: </span>
                    {m.notes}
                  </div>
                )}

                {actionItems.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500">Action items:</p>
                    <ul className="mt-1 space-y-1">
                      {actionItems.map((ai, i) => (
                        <li
                          key={i}
                          className={`flex items-center gap-2 text-xs ${ai.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                        >
                          <CheckCircle
                            className={`h-3.5 w-3.5 shrink-0 ${ai.done ? 'text-green-400' : 'text-gray-300'}`}
                          />
                          {ai.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.status === 'scheduled' && !isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(m.id)
                      setNotes('')
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Agregar notas y completar
                  </button>
                )}

                {isActive && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={3}
                      placeholder="Notas de la reunión..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveId(null)}
                        className="flex-1 rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={acknowledge.isPending}
                        onClick={() => acknowledge.mutate({ id: m.id, notes: notes || undefined })}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Marcar completada
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
