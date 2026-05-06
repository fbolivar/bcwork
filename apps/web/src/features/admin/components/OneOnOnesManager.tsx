'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Users, Plus, X, Trash2, Calendar, Clock } from 'lucide-react'

const STATUS_OPTS = ['scheduled', 'completed', 'cancelled'] as const
type Status = (typeof STATUS_OPTS)[number]

const STATUS_LABELS: Record<Status, string> = {
  scheduled: 'Programada',
  completed: 'Completada',
  cancelled: 'Cancelada',
}
const STATUS_COLORS: Record<Status, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export function OneOnOnesManager() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('30')
  const [agenda, setAgenda] = useState('')

  const { data: meetings, isLoading } = trpc.admin.list1on1s.useQuery({
    employee_id: filterEmployee || undefined,
  })
  const { data: usersData } = trpc.admin.listUsers.useQuery({ pageSize: 100 })

  const create = trpc.admin.create1on1.useMutation({
    onSuccess: () => {
      utils.admin.list1on1s.invalidate()
      setShowCreate(false)
      setEmployeeId('')
      setManagerId('')
      setScheduledAt('')
      setDuration('30')
      setAgenda('')
    },
  })

  const remove = trpc.admin.delete1on1.useMutation({
    onSuccess: () => utils.admin.list1on1s.invalidate(),
  })

  const allMeetings = (meetings ?? []) as any[]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reuniones 1:1</h2>
          <p className="mt-0.5 text-sm text-gray-500">Gestiona las sesiones de seguimiento</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva reunión
        </button>
      </div>

      <div className="flex gap-2">
        <select
          title="Filtrar por empleado"
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todos los empleados</option>
          {(usersData?.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allMeetings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay reuniones programadas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allMeetings.map((m: any) => {
            const status = (m.status ?? 'scheduled') as Status
            const statusColor = STATUS_COLORS[status] ?? STATUS_COLORS.scheduled
            const statusLabel = STATUS_LABELS[status] ?? m.status
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">
                      {m.employee?.full_name ?? '—'} ↔ {m.manager?.full_name ?? '—'}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
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
                    {m.agenda && <span className="max-w-[200px] truncate">{m.agenda}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  title="Eliminar"
                  onClick={() => remove.mutate({ id: m.id })}
                  disabled={remove.isPending}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nueva reunión 1:1</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="oo-employee" className="text-xs font-medium text-gray-700">
                    Empleado
                  </label>
                  <select
                    id="oo-employee"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {(usersData?.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="oo-manager" className="text-xs font-medium text-gray-700">
                    Manager
                  </label>
                  <select
                    id="oo-manager"
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {(usersData?.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="oo-date" className="text-xs font-medium text-gray-700">
                    Fecha y hora
                  </label>
                  <input
                    id="oo-date"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="oo-dur" className="text-xs font-medium text-gray-700">
                    Duración (min)
                  </label>
                  <input
                    id="oo-dur"
                    type="number"
                    min="15"
                    step="15"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="oo-agenda" className="text-xs font-medium text-gray-700">
                  Agenda (opcional)
                </label>
                <textarea
                  id="oo-agenda"
                  rows={3}
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  placeholder="Temas a tratar..."
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
                disabled={!employeeId || !managerId || !scheduledAt || create.isPending}
                onClick={() =>
                  create.mutate({
                    employee_id: employeeId,
                    manager_id: managerId,
                    scheduled_at: scheduledAt,
                    duration_minutes: Number(duration),
                    agenda: agenda || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Programar reunión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
