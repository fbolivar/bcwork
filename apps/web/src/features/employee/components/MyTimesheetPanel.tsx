'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'

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

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

type Status = 'present' | 'partial' | 'absent' | 'non_work_day' | 'future'

const STATUS_CONFIG: Record<Status, { label: string; cls: string }> = {
  present: { label: 'Presente', cls: 'bg-green-100 text-green-700' },
  partial: { label: 'Parcial', cls: 'bg-yellow-100 text-yellow-700' },
  absent: { label: 'Ausente', cls: 'bg-red-100 text-red-700' },
  non_work_day: { label: 'No laboral', cls: 'bg-gray-100 text-gray-400' },
  future: { label: '—', cls: 'bg-gray-50 text-gray-300' },
}

export function MyTimesheetPanel() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const { data, isLoading } = trpc.employee.getMyTimesheet.useQuery({ year, month })

  function prevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }

  function nextMonth() {
    const now = new Date()
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1))
      return
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  function downloadCSV() {
    if (!data) return
    const rows = data.rows.filter((r) => r.status !== 'future')
    const lines = [
      'Fecha,Día,Primer ingreso,Último egreso,Tiempo trabajado,Esperado,Horas extra,Productividad,Estado',
      ...rows.map((r) =>
        [
          r.date,
          DOW[r.dow],
          fmtTime(r.firstIn),
          fmtTime(r.lastOut),
          fmtHours(r.workedSecs),
          fmtHours(r.expectedSecs),
          fmtHours(r.overtimeSecs),
          `${Math.round(r.productivityRatio * 100)}%`,
          STATUS_CONFIG[r.status as Status]?.label ?? r.status,
        ].join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `asistencia_${year}_${String(month).padStart(2, '0')}.csv`
    a.click()
  }

  const rows = data?.rows ?? []
  const workRows = rows.filter((r) => r.isWorkDay && r.status !== 'future')
  const presentDays = workRows.filter((r) => r.status === 'present').length
  const totalWorked = workRows.reduce((s, r) => s + r.workedSecs, 0)
  const totalOvertime = workRows.reduce((s, r) => s + r.overtimeSecs, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ficha de asistencia</h1>
          <p className="mt-0.5 text-sm text-gray-500">Tu registro mensual de entradas y salidas</p>
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
          <button
            type="button"
            onClick={downloadCSV}
            title="Descargar CSV"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Summary chips */}
      {!isLoading && workRows.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">Días presentes</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">{presentDays}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">Tiempo total trabajado</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">{fmtHours(totalWorked)}</p>
          </div>
          {totalOvertime > 0 && (
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-3">
              <p className="text-xs text-yellow-600">Horas extra</p>
              <p className="mt-0.5 text-2xl font-bold text-yellow-700">{fmtHours(totalOvertime)}</p>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="animate-pulse space-y-2 p-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Día</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ingreso</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Salida</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Trabajado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Esperado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    H. Extra
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    Productiv.
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => {
                  const cfg = STATUS_CONFIG[row.status as Status] ?? STATUS_CONFIG.future
                  const isDim = row.status === 'non_work_day' || row.status === 'future'
                  return (
                    <tr key={row.date} className={isDim ? 'opacity-40' : 'hover:bg-gray-50'}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gray-600">
                        {row.date.slice(5)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{DOW[row.dow]}</td>
                      <td className="px-4 py-2.5 tabular-nums text-gray-700">
                        {fmtTime(row.firstIn)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-gray-700">
                        {fmtTime(row.lastOut)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-gray-900">
                        {row.workedSecs > 0 ? fmtHours(row.workedSecs) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                        {row.isWorkDay && row.expectedSecs > 0 ? fmtHours(row.expectedSecs) : '—'}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums ${row.overtimeSecs > 0 ? 'font-medium text-yellow-600' : 'text-gray-400'}`}
                      >
                        {row.overtimeSecs > 0 ? fmtHours(row.overtimeSecs) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                        {row.productivityRatio > 0
                          ? `${Math.round(row.productivityRatio * 100)}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
