'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Video, Plus, X, CheckCircle2, XCircle } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Programada', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completada', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500' },
}

export function Team1on1sPanel() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [editNotes, setEditNotes] = useState<{ id: string; notes: string } | null>(null)
  const [upcoming, setUpcoming] = useState(true)

  const [employeeId, setEmployeeId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('30')
  const [agenda, setAgenda] = useState('')

  const { data: meetings, isLoading } = trpc.manager.getTeam1on1s.useQuery({ upcoming })
  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )

  const create = trpc.manager.createTeam1on1.useMutation({
    onSuccess: () => {
      utils.manager.getTeam1on1s.invalidate()
      setShowCreate(false)
      setEmployeeId('')
      setScheduledAt('')
      setDuration('30')
      setAgenda('')
    },
  })

  const update = trpc.manager.updateTeam1on1.useMutation({
    onSuccess: () => {
      utils.manager.getTeam1on1s.invalidate()
      setEditNotes(null)
    },
  })

  const allMeetings = (meetings ?? []) as any[]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reuniones 1:1</h2>
          <p className="mt-0.5 text-sm text-gray-500">Agenda y registra reuniones con tu equipo</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nueva reunión
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setUpcoming(true)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${upcoming ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          Próximas
        </button>
        <button
          type="button"
          onClick={() => setUpcoming(false)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!upcoming ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          Historial
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allMeetings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Video className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            No hay reuniones {upcoming ? 'próximas' : 'pasadas'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allMeetings.map((m: any) => {
            const st = STATUS_MAP[m.status] ?? STATUS_MAP.scheduled
            const dt = new Date(m.scheduled_at)
            return (
              <div key={m.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-start gap-3">
                  <Video className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">
                        {m.user_name ?? m.user_email}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st?.color ?? 'bg-gray-100 text-gray-500'}`}
                      >
                        {st?.label ?? m.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {dt.toLocaleDateString('es-CO', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                      {' a las '}
                      {dt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {m.duration_minutes} min
                    </p>
                    {m.agenda && <p className="mt-1 text-xs text-gray-500">Agenda: {m.agenda}</p>}
                    {m.notes && <p className="mt-1 text-xs italic text-gray-400">"{m.notes}"</p>}
                  </div>
                  {m.status === 'scheduled' && (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        title="Agregar notas"
                        onClick={() => setEditNotes({ id: m.id, notes: m.notes ?? '' })}
                        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Notas
                      </button>
                      <button
                        type="button"
                        title="Completar"
                        onClick={() => update.mutate({ id: m.id, status: 'completed' })}
                        disabled={update.isPending}
                        className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-700 hover:bg-green-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Cancelar"
                        onClick={() => update.mutate({ id: m.id, status: 'cancelled' })}
                        disabled={update.isPending}
                        className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-100"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {editNotes?.id === m.id && (
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    <textarea
                      value={editNotes?.notes ?? ''}
                      onChange={(e) =>
                        setEditNotes(editNotes ? { id: editNotes.id, notes: e.target.value } : null)
                      }
                      rows={3}
                      placeholder="Notas de la reunión..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditNotes(null)}
                        className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: m.id, notes: editNotes?.notes ?? '' })}
                        className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Agendar reunión 1:1</h3>
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
                <label className="text-xs font-medium text-gray-700">Empleado</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {(members ?? []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Duración (minutos)</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  {[15, 30, 45, 60, 90].map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Agenda (opcional)</label>
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  rows={2}
                  placeholder="Temas a tratar..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
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
                disabled={!employeeId || !scheduledAt || create.isPending}
                onClick={() =>
                  create.mutate({
                    employee_id: employeeId,
                    scheduled_at: scheduledAt,
                    duration_minutes: Number(duration),
                    agenda: agenda || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
