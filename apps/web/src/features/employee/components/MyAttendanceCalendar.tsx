'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
const DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type Status = 'present' | 'partial' | 'absent' | 'time_off' | 'non_work_day' | 'future'

const STATUS_STYLE: Record<Status, string> = {
  present: 'bg-green-500 text-white',
  partial: 'bg-yellow-400 text-white',
  absent: 'bg-red-400 text-white',
  time_off: 'bg-blue-400 text-white',
  non_work_day: 'bg-gray-100 text-gray-400',
  future: 'bg-transparent text-gray-300',
}

const LEGEND = [
  { status: 'present' as Status, label: 'Presente' },
  { status: 'partial' as Status, label: 'Parcial' },
  { status: 'absent' as Status, label: 'Ausente' },
  { status: 'time_off' as Status, label: 'Licencia/Permiso' },
  { status: 'non_work_day' as Status, label: 'No laboral' },
]

export function MyAttendanceCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const { data, isLoading } = trpc.employee.getMyAttendanceCalendar.useQuery({ year, month })

  function prevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (year === today.getFullYear() && month >= today.getMonth() + 1) return
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  // Build calendar grid: weeks starting on Monday
  const days = data?.days ?? []
  const firstDay = new Date(year, month - 1, 1)
  // Monday=0 offset
  const startOffset = (firstDay.getDay() + 6) % 7
  const paddedDays = [...Array(startOffset).fill(null), ...days]
  const weeks: ((typeof days)[number] | null)[][] = []
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7) as ((typeof days)[number] | null)[])
  }

  const summary = data?.summary

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Calendario de asistencia</h1>
          <p className="mt-0.5 text-sm text-gray-500">Vista mensual de tu presencia laboral</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Mes anterior"
            onClick={prevMonth}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-medium text-gray-700">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            type="button"
            title="Mes siguiente"
            onClick={nextMonth}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
            disabled={year === today.getFullYear() && month >= today.getMonth() + 1}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary row */}
      {summary && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Días presentes', value: summary.presentCount, color: 'text-green-600' },
            { label: 'Días parciales', value: summary.partialCount, color: 'text-yellow-600' },
            { label: 'Días ausentes', value: summary.absentCount, color: 'text-red-600' },
            { label: 'Licencias', value: summary.timeOffCount, color: 'text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`mt-0.5 text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="h-10 flex-1 rounded-lg bg-gray-100" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {DOW_LABELS.map((d) => (
                <div key={d} className="text-center text-[11px] font-medium text-gray-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="mb-1 grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, di) => {
                  const cell = week[di] ?? null
                  if (!cell) return <div key={di} />
                  const todayStr = today.toISOString().slice(0, 10)
                  const isToday = cell.date === todayStr
                  const style = STATUS_STYLE[cell.status as Status] ?? STATUS_STYLE.future
                  return (
                    <div
                      key={di}
                      title={`${cell.date} — ${cell.status}`}
                      className={`flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-transform hover:scale-105 ${style} ${isToday ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}
                    >
                      {Number(cell.date.slice(8))}
                    </div>
                  )
                })}
              </div>
            ))}
          </>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
          {LEGEND.map((l) => (
            <div key={l.status} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-sm ${STATUS_STYLE[l.status]}`} />
              <span className="text-xs text-gray-500">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
