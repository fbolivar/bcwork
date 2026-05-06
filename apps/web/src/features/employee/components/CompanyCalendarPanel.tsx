'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

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

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function CompanyCalendarPanel() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: events, isLoading } = trpc.employee.getCompanyCalendar.useQuery({ year, month })
  const allEvents = (events ?? []) as any[]

  function prevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : -1

  const eventsByDay = allEvents.reduce((acc: Record<number, any[]>, e: any) => {
    const d = parseInt(e.event_date.split('-')[2])
    if (!acc[d]) acc[d] = []
    acc[d].push(e)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Calendario de empresa</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Festivos, eventos corporativos y fechas importantes
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            title="Mes anterior"
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button
            type="button"
            title="Mes siguiente"
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayEvents = eventsByDay[day] ?? []
            const isToday = day === today
            return (
              <div
                key={day}
                className={`relative min-h-[52px] rounded-lg p-1 ${isToday ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-gray-50'}`}
              >
                <span
                  className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}
                >
                  {day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e: any) => (
                    <div
                      key={e.id}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight"
                      style={{ backgroundColor: `${e.color}22`, color: e.color }}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-gray-400">+{dayEvents.length - 2}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center">
          <CalendarDays className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay eventos este mes</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Eventos del mes
          </p>
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
                  {e.description && <p className="text-xs text-gray-400">{e.description}</p>}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[et] ?? TYPE_COLORS.other}`}
                >
                  {TYPE_LABELS[et] ?? et}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
