'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CalendarDays, Plus, X, Trash2 } from 'lucide-react'

type EventType = 'holiday' | 'corporate' | 'birthday' | 'payroll' | 'other'

const TYPE_LABELS: Record<EventType, string> = {
  holiday: 'Festivo',
  corporate: 'Corporativo',
  birthday: 'Cumpleaños',
  payroll: 'Nómina',
  other: 'Otro',
}

const TYPE_COLORS: Record<EventType, string> = {
  holiday: 'bg-red-100 text-red-700',
  corporate: 'bg-blue-100 text-blue-700',
  birthday: 'bg-pink-100 text-pink-700',
  payroll: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-600',
}

const COLOR_PRESETS = [
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Rojo', value: '#ef4444' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Morado', value: '#8b5cf6' },
]

export function CompanyEventsManager() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [eventType, setEventType] = useState<EventType>('corporate')
  const [color, setColor] = useState('#3b82f6')

  const { data: events, isLoading } = trpc.admin.listCompanyEvents.useQuery({ year: filterYear })

  const create = trpc.admin.createCompanyEvent.useMutation({
    onSuccess: () => {
      utils.admin.listCompanyEvents.invalidate()
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setEventDate('')
      setEndDate('')
      setEventType('corporate')
      setColor('#3b82f6')
    },
  })

  const remove = trpc.admin.deleteCompanyEvent.useMutation({
    onSuccess: () => utils.admin.listCompanyEvents.invalidate(),
  })

  const allEvents = (events ?? []) as any[]
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Calendario de empresa</h2>
          <p className="mt-0.5 text-sm text-gray-500">Gestiona festivos y eventos corporativos</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo evento
        </button>
      </div>

      <div className="flex gap-2">
        <select
          title="Filtrar por año"
          value={filterYear}
          onChange={(e) => setFilterYear(Number(e.target.value))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay eventos para {filterYear}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allEvents.map((e: any) => {
            const et = (e.event_type ?? 'other') as EventType
            return (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: e.color }}
                >
                  {new Date(e.event_date + 'T12:00:00').getDate()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{e.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(e.event_date + 'T12:00:00').toLocaleDateString('es-CO', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                    })}
                    {e.end_date &&
                      e.end_date !== e.event_date &&
                      ` → ${new Date(e.end_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[et] ?? TYPE_COLORS.other}`}
                >
                  {TYPE_LABELS[et] ?? et}
                </span>
                <button
                  type="button"
                  title="Eliminar"
                  onClick={() => remove.mutate({ id: e.id })}
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
              <h3 className="text-base font-semibold text-gray-900">Nuevo evento</h3>
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
              <div>
                <label htmlFor="ev-title" className="text-xs font-medium text-gray-700">
                  Título
                </label>
                <input
                  id="ev-title"
                  type="text"
                  placeholder="Ej: Día de la independencia"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ev-type" className="text-xs font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    id="ev-type"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ev-date" className="text-xs font-medium text-gray-700">
                    Fecha
                  </label>
                  <input
                    id="ev-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ev-end" className="text-xs font-medium text-gray-700">
                    Fecha fin (opcional)
                  </label>
                  <input
                    id="ev-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">Color</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        title={p.label}
                        onClick={() => setColor(p.value)}
                        className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${color === p.value ? 'scale-110 border-gray-800' : 'border-transparent'}`}
                        style={{ backgroundColor: p.value }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="ev-desc" className="text-xs font-medium text-gray-700">
                  Descripción (opcional)
                </label>
                <input
                  id="ev-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                disabled={!title.trim() || !eventDate || create.isPending}
                onClick={() =>
                  create.mutate({
                    title,
                    description: description || undefined,
                    event_date: eventDate,
                    end_date: endDate || undefined,
                    event_type: eventType,
                    color,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
