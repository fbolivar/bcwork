'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  vacation: 'bg-blue-100 text-blue-700',
  sick: 'bg-red-100 text-red-600',
  personal: 'bg-purple-100 text-purple-700',
  maternity: 'bg-pink-100 text-pink-700',
  paternity: 'bg-indigo-100 text-indigo-700',
  bereavement: 'bg-gray-200 text-gray-600',
  other: 'bg-gray-100 text-gray-600',
}

const TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacaciones',
  sick: 'Enfermedad',
  personal: 'Personal',
  maternity: 'Maternidad',
  paternity: 'Paternidad',
  bereavement: 'Duelo',
  other: 'Otro',
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
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

export function TeamCalendarPanel() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const { data, isLoading } = trpc.manager.getTeamCalendar.useQuery({ year, month })

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
  const pad = (n: number) => String(n).padStart(2, '0')

  // Build events per date
  const eventsByDate: Record<
    string,
    Array<{ type: 'absence' | '1on1' | 'event'; label: string; colorClass: string }>
  > = {}

  function addEvent(
    date: string,
    ev: { type: 'absence' | '1on1' | 'event'; label: string; colorClass: string },
  ) {
    if (!eventsByDate[date]) eventsByDate[date] = []
    eventsByDate[date].push(ev)
  }

  if (data) {
    for (const a of data.absences) {
      const start = new Date(a.start_date + 'T12:00:00')
      const end = new Date(a.end_date + 'T12:00:00')
      const cur = new Date(start)
      while (cur <= end) {
        const d = cur.toISOString().slice(0, 10)
        addEvent(d, {
          type: 'absence',
          label: `${a.full_name ?? a.email} - ${TYPE_LABELS[a.type] ?? a.type}${a.status === 'pending' ? ' (pendiente)' : ''}`,
          colorClass: TYPE_COLORS[a.type] ?? 'bg-gray-100 text-gray-600',
        })
        cur.setDate(cur.getDate() + 1)
      }
    }
    for (const o of data.one_on_ones) {
      const d = o.scheduled_at.slice(0, 10)
      const time = new Date(o.scheduled_at).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      })
      addEvent(d, {
        type: '1on1',
        label: `1:1 ${o.full_name ?? ''} ${time}`,
        colorClass: 'bg-green-100 text-green-700',
      })
    }
    for (const e of data.events) {
      addEvent(e.event_date, {
        type: 'event',
        label: e.title,
        colorClass: 'bg-orange-100 text-orange-700',
      })
    }
  }

  const cells: Array<{ day: number | null; date: string | null }> = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, date: null })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: `${year}-${pad(month)}-${pad(d)}` })
  }

  const todayStr = today.toISOString().slice(0, 10)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Calendario del equipo</h2>
          <p className="mt-0.5 text-sm text-gray-500">Ausencias, 1:1s y eventos de empresa</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {[
          { label: 'Vacaciones', color: 'bg-blue-100 text-blue-700' },
          { label: 'Enfermedad', color: 'bg-red-100 text-red-600' },
          { label: '1:1', color: 'bg-green-100 text-green-700' },
          { label: 'Evento empresa', color: 'bg-orange-100 text-orange-700' },
        ].map((l) => (
          <span key={l.label} className={`rounded-full px-2 py-0.5 font-medium ${l.color}`}>
            {l.label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">
                {d}
              </div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const evs = cell.date ? (eventsByDate[cell.date] ?? []) : []
              const isToday = cell.date === todayStr
              return (
                <div
                  key={i}
                  className={`min-h-[80px] border-b border-r border-gray-50 p-1.5 ${
                    cell.day ? 'bg-white' : 'bg-gray-50/50'
                  } ${i % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  {cell.day && (
                    <>
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                          isToday ? 'bg-blue-600 text-white' : 'text-gray-600'
                        }`}
                      >
                        {cell.day}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {evs.slice(0, 3).map((ev, j) => (
                          <div
                            key={j}
                            title={ev.label}
                            className={`truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight ${ev.colorClass}`}
                          >
                            {ev.label}
                          </div>
                        ))}
                        {evs.length > 3 && (
                          <div className="text-[9px] text-gray-400">+{evs.length - 3} más</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming list */}
      {data &&
        (data.absences.length > 0 || data.one_on_ones.length > 0 || data.events.length > 0) && (
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="mb-3 text-xs font-medium text-gray-500">Este mes</p>
            <div className="space-y-2">
              {data.absences.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-medium ${TYPE_COLORS[a.type] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {TYPE_LABELS[a.type] ?? a.type}
                  </span>
                  <span className="font-medium text-gray-700">{a.full_name ?? a.email}</span>
                  <span className="text-gray-400">
                    {a.start_date} → {a.end_date}
                  </span>
                  {a.status === 'pending' && (
                    <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-yellow-700">
                      pendiente
                    </span>
                  )}
                </div>
              ))}
              {data.one_on_ones.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-green-100 px-1.5 py-0.5 font-medium text-green-700">
                    1:1
                  </span>
                  <span className="font-medium text-gray-700">{o.full_name}</span>
                  <span className="text-gray-400">
                    {new Date(o.scheduled_at).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
              ))}
              {data.events.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-orange-100 px-1.5 py-0.5 font-medium text-orange-700">
                    Evento
                  </span>
                  <span className="font-medium text-gray-700">{e.title}</span>
                  <span className="text-gray-400">{e.event_date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      {data &&
        data.absences.length === 0 &&
        data.one_on_ones.length === 0 &&
        data.events.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center">
            <CalendarDays className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">Sin eventos este mes</p>
          </div>
        )}
    </div>
  )
}
