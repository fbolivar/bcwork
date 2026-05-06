'use client'

import { trpc } from '@/lib/trpc-client'
import { CalendarDays, Clock, Coffee, Zap, AlertCircle } from 'lucide-react'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAY_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function fmtTime(t: string) {
  // t = "HH:MM:SS" → "HH:MM"
  return t.slice(0, 5)
}

function fmtHours(h: number) {
  if (h === Math.floor(h)) return `${h}h`
  return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`
}

function getNextDays(daysOfWeek: number[], count = 14) {
  const result: { date: string; dayName: string; isWorkDay: boolean; isToday: boolean }[] = []
  const today = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    result.push({
      date: iso,
      dayName: DAY_NAMES[d.getDay()] ?? '',
      isWorkDay: daysOfWeek.includes(d.getDay()),
      isToday: i === 0,
    })
  }
  return result
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium opacity-70">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs opacity-60">{sub}</p>}
    </div>
  )
}

export function MySchedulePanel() {
  const { data: schedule, isLoading } = trpc.employee.getMySchedule.useQuery()

  const today = new Date().getDay()

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center text-gray-400">Cargando...</div>
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No tienes un horario asignado</p>
        <p className="mt-1 text-xs text-gray-400">
          Contacta a tu administrador para que te asigne un horario de trabajo
        </p>
      </div>
    )
  }

  const days = schedule.days_of_week ?? []
  const upcomingDays = getNextDays(days, 14)
  const isWorkingToday = days.includes(today)
  const hoursPerDay =
    schedule.weekly_hours > 0 && days.length > 0 ? schedule.weekly_hours / days.length : 8

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mi horario</h1>
        <p className="mt-1 text-sm text-gray-500">Horario laboral asignado por tu organización.</p>
      </div>

      {/* Tarjeta principal del horario */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{schedule.name}</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {isWorkingToday ? (
                <span className="font-medium text-green-600">Hoy es día laboral</span>
              ) : (
                <span className="text-gray-400">Hoy no es día laboral</span>
              )}
            </p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            {fmtHours(schedule.weekly_hours)} / semana
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Clock}
            label="Entrada"
            value={fmtTime(schedule.start_time)}
            color="bg-white border-gray-200 text-gray-800"
          />
          <StatCard
            icon={Clock}
            label="Salida"
            value={fmtTime(schedule.end_time)}
            color="bg-white border-gray-200 text-gray-800"
          />
          <StatCard
            icon={Coffee}
            label="Descanso"
            value={`${schedule.break_minutes}m`}
            sub="por día"
            color="bg-white border-gray-200 text-gray-800"
          />
          <StatCard
            icon={Zap}
            label="Tolerancia"
            value={`${schedule.disconnection_grace_minutes}m`}
            sub="desconexión"
            color="bg-white border-gray-200 text-gray-800"
          />
        </div>
      </div>

      {/* Días de trabajo */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Días laborales</h2>
        <div className="flex gap-2">
          {DAY_NAMES.map((name, idx) => {
            const isWork = days.includes(idx)
            const isTod = idx === today
            return (
              <div
                key={idx}
                className={`flex flex-1 flex-col items-center rounded-xl border py-3 ${
                  isTod
                    ? isWork
                      ? 'border-blue-400 bg-blue-600 text-white'
                      : 'border-gray-300 bg-gray-100 text-gray-400'
                    : isWork
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-gray-100 bg-gray-50 text-gray-300'
                }`}
              >
                <span className="text-xs font-medium">{name}</span>
                {isWork && (
                  <span className={`mt-1 text-[10px] ${isTod ? 'text-blue-200' : 'text-blue-400'}`}>
                    {fmtHours(hoursPerDay)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Próximos 14 días */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Próximas 2 semanas</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {upcomingDays.map(({ date, dayName, isWorkDay, isToday }) => (
            <div
              key={date}
              className={`flex flex-col items-center rounded-lg border py-2.5 ${
                isToday
                  ? 'border-blue-400 bg-blue-600 text-white'
                  : isWorkDay
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-gray-100 bg-gray-50 text-gray-300'
              }`}
            >
              <span className="text-[10px] font-medium">{dayName}</span>
              <span className={`mt-0.5 text-sm font-bold ${isToday ? 'text-white' : ''}`}>
                {new Date(date + 'T12:00:00').getDate()}
              </span>
              {isWorkDay && !isToday && <div className="mt-1 h-1 w-1 rounded-full bg-green-400" />}
            </div>
          ))}
        </div>
      </div>

      {/* Resumen de horas */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Resumen del horario</h2>
        <dl className="space-y-2.5 text-sm">
          {[
            ['Días laborales', DAY_FULL.filter((_, i) => days.includes(i)).join(', ')],
            ['Horas semanales', fmtHours(schedule.weekly_hours)],
            ['Horas diarias', fmtHours(hoursPerDay)],
            ['Horario', `${fmtTime(schedule.start_time)} — ${fmtTime(schedule.end_time)}`],
            ['Descanso diario', `${schedule.break_minutes} minutos`],
            ['Tolerancia desconexión', `${schedule.disconnection_grace_minutes} minutos`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-gray-500">{label}</dt>
              <dd className="max-w-[60%] text-right font-medium text-gray-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-center text-xs text-gray-400">
        Para cambios en tu horario, contacta a tu administrador o manager.
      </p>
    </div>
  )
}
