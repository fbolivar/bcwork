'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, Trash2, Clock } from 'lucide-react'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DEFAULT_FORM = {
  name: '',
  timezone: 'America/Bogota',
  days_of_week: [1, 2, 3, 4, 5],
  start_time: '08:00',
  end_time: '18:00',
  disconnection_grace_minutes: 30,
}

export function ScheduleManager() {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)

  const utils = trpc.useUtils()
  const { data: schedules, isLoading } = trpc.admin.listSchedules.useQuery()
  const create = trpc.admin.createSchedule.useMutation({
    onSuccess: () => {
      setForm(DEFAULT_FORM)
      setCreating(false)
      void utils.admin.listSchedules.invalidate()
    },
  })
  const remove = trpc.admin.deleteSchedule.useMutation({
    onSuccess: () => utils.admin.listSchedules.invalidate(),
  })

  const toggleDay = (d: number) =>
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter((x) => x !== d)
        : [...f.days_of_week, d].sort((a, b) => a - b),
    }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo horario
        </button>
      </div>

      {creating && (
        <form
          className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate(form)
          }}
        >
          <h3 className="text-sm font-semibold text-blue-800">Nuevo horario</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Zona horaria</label>
              <input
                type="text"
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Hora inicio</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Hora fin</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">Días laborales</label>
            <div className="flex gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    form.days_of_week.includes(i)
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-xs">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Gracia desconexión (min) — Ley 2191
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={form.disconnection_grace_minutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, disconnection_grace_minutes: Number(e.target.value) }))
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Tiempo permitido fuera del horario laboral sin alerta.
            </p>
          </div>

          {create.error && <p className="text-sm text-red-600">{create.error.message}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {create.isPending ? 'Creando...' : 'Crear horario'}
            </button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && (schedules ?? []).length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12">
          <Clock className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Sin horarios. Crea uno para empezar.</p>
        </div>
      )}

      <div className="space-y-2">
        {(schedules ?? []).map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4"
          >
            <div>
              <p className="font-medium text-gray-900">{s.name}</p>
              <p className="text-sm text-gray-500">
                {(s.days_of_week as number[]).map((d) => DAYS[d]).join(', ')} · {s.start_time} –{' '}
                {s.end_time}
              </p>
              <p className="text-xs text-gray-400">
                {s.timezone} · Gracia: {s.disconnection_grace_minutes} min
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar "${s.name}"?`)) remove.mutate({ id: s.id })
              }}
              disabled={remove.isPending}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
