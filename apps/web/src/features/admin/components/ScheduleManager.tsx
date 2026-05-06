'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, Trash2, Clock, ChevronDown, ChevronUp, Bell, BellOff } from 'lucide-react'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const DEFAULT_BREAK_MSG =
  'Llevas mucho tiempo conectado delante de tu PC, por favor toma un descanso de unos minutos.'
const DEFAULT_EOD_MSG =
  'Has llegado al fin de tu jornada laboral. Recuerda que hasta tu siguiente día laboral no estás en la obligación de atender asuntos profesionales.'

const DEFAULT_FORM = {
  name: '',
  timezone: 'America/Bogota',
  days_of_week: [1, 2, 3, 4, 5],
  start_time: '08:00',
  end_time: '18:00',
  disconnection_grace_minutes: 30,
  break_alert_enabled: true,
  break_alert_interval_minutes: 90,
  break_alert_message: DEFAULT_BREAK_MSG,
  end_of_day_alert_enabled: true,
  end_of_day_alert_offset_minutes: 0,
  end_of_day_alert_message: DEFAULT_EOD_MSG,
}

type AlertForm = typeof DEFAULT_FORM

function AlertConfigSection({
  form,
  setForm,
}: {
  form: AlertForm
  setForm: React.Dispatch<React.SetStateAction<AlertForm>>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-400" />
          Configuración de alertas
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="space-y-5 border-t border-gray-200 px-4 py-4">
          {/* Alerta de pausa */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">Alerta de pausa</p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  Avisa al empleado cuando lleva demasiado tiempo seguido frente a la pantalla.
                  Basado en el ritmo ultradiano (ciclos naturales de 90 min de concentración).
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, break_alert_enabled: !f.break_alert_enabled }))
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  form.break_alert_enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.break_alert_enabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {form.break_alert_enabled && (
              <div className="ml-0 space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Intervalo de actividad continua (minutos)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      aria-label="Intervalo de actividad continua en minutos"
                      min={30}
                      max={180}
                      step={15}
                      value={form.break_alert_interval_minutes}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          break_alert_interval_minutes: Number(e.target.value),
                        }))
                      }
                      className="flex-1 accent-blue-600"
                    />
                    <span className="w-14 text-right text-sm font-semibold tabular-nums text-blue-700">
                      {form.break_alert_interval_minutes} min
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                    <span>30 min (Pomodoro)</span>
                    <span>60 min (OSHA)</span>
                    <span>90 min (recomendado)</span>
                    <span>180 min</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Mensaje de la alerta
                  </label>
                  <textarea
                    aria-label="Mensaje de la alerta de pausa"
                    value={form.break_alert_message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, break_alert_message: e.target.value }))
                    }
                    rows={2}
                    maxLength={500}
                    className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-0.5 text-right text-[10px] text-gray-400">
                    {form.break_alert_message.length}/500
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200" />

          {/* Alerta fin de jornada */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">Alerta fin de jornada</p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  Notifica al empleado cuando su horario laboral ha terminado (Ley 2191 —
                  desconexión digital).
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, end_of_day_alert_enabled: !f.end_of_day_alert_enabled }))
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  form.end_of_day_alert_enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.end_of_day_alert_enabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {form.end_of_day_alert_enabled && (
              <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Anticipación (minutos antes de la hora de salida)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      aria-label="Anticipación en minutos antes de la hora de salida"
                      min={-30}
                      max={0}
                      step={5}
                      value={form.end_of_day_alert_offset_minutes}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          end_of_day_alert_offset_minutes: Number(e.target.value),
                        }))
                      }
                      className="flex-1 accent-amber-600"
                    />
                    <span className="w-24 text-right text-sm font-semibold tabular-nums text-amber-700">
                      {form.end_of_day_alert_offset_minutes === 0
                        ? 'Al llegar'
                        : `${Math.abs(form.end_of_day_alert_offset_minutes)} min antes`}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Mensaje de la alerta
                  </label>
                  <textarea
                    aria-label="Mensaje de la alerta de fin de jornada"
                    value={form.end_of_day_alert_message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, end_of_day_alert_message: e.target.value }))
                    }
                    rows={3}
                    maxLength={500}
                    className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-0.5 text-right text-[10px] text-gray-400">
                    {form.end_of_day_alert_message.length}/500
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type Schedule = {
  id: string
  name: string
  timezone: string
  days_of_week: number[] | null
  start_time: string | null
  end_time: string | null
  disconnection_grace_minutes: number | null
  break_alert_enabled: boolean | null
  break_alert_interval_minutes: number | null
  end_of_day_alert_enabled: boolean | null
}

function ScheduleCard({
  s,
  onDelete,
  isDeleting,
}: {
  s: Schedule
  onDelete: () => void
  isDeleting: boolean
}) {
  const days = (s.days_of_week as number[] | null) ?? []
  const breakOn = s.break_alert_enabled ?? true
  const eodOn = s.end_of_day_alert_enabled ?? true

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900">{s.name}</p>
          <p className="text-sm text-gray-500">
            {days.map((d) => DAYS[d]).join(', ')} · {s.start_time} – {s.end_time}
          </p>
          <p className="text-xs text-gray-400">
            {s.timezone} · Gracia: {s.disconnection_grace_minutes} min
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                breakOn ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {breakOn ? <Bell className="h-2.5 w-2.5" /> : <BellOff className="h-2.5 w-2.5" />}
              Pausa: {breakOn ? `${s.break_alert_interval_minutes ?? 90} min` : 'desactivada'}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                eodOn ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {eodOn ? <Bell className="h-2.5 w-2.5" /> : <BellOff className="h-2.5 w-2.5" />}
              Fin jornada: {eodOn ? 'activada' : 'desactivada'}
            </span>
          </div>
        </div>
        <button
          type="button"
          title="Eliminar horario"
          onClick={onDelete}
          disabled={isDeleting}
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function ScheduleManager() {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<AlertForm>(DEFAULT_FORM)

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
          type="button"
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
              <label htmlFor="sched-name" className="mb-1 block text-xs font-medium text-gray-600">
                Nombre *
              </label>
              <input
                id="sched-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sched-tz" className="mb-1 block text-xs font-medium text-gray-600">
                Zona horaria
              </label>
              <input
                id="sched-tz"
                type="text"
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sched-start" className="mb-1 block text-xs font-medium text-gray-600">
                Hora inicio
              </label>
              <input
                id="sched-start"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sched-end" className="mb-1 block text-xs font-medium text-gray-600">
                Hora fin
              </label>
              <input
                id="sched-end"
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
            <label htmlFor="sched-grace" className="mb-1 block text-xs font-medium text-gray-600">
              Gracia desconexión (min) — Ley 2191
            </label>
            <input
              id="sched-grace"
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

          <AlertConfigSection form={form} setForm={setForm} />

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
          <ScheduleCard
            key={s.id}
            s={s as Schedule}
            onDelete={() => {
              if (confirm(`¿Eliminar "${s.name}"?`)) remove.mutate({ id: s.id })
            }}
            isDeleting={remove.isPending}
          />
        ))}
      </div>
    </div>
  )
}
