'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { ClipboardList, Download } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 13)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export function TeamTimesheetPanel() {
  const range = defaultRange()
  const [dateFrom, setDateFrom] = useState(range.from)
  const [dateTo, setDateTo] = useState(range.to)
  const [groupBy, setGroupBy] = useState<'person' | 'date'>('person')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id

  const { data: rows, isLoading } = trpc.manager.getTeamTimesheet.useQuery(
    {
      teamId,
      dateFrom,
      dateTo,
    },
    { enabled: !!teamId || true },
  )

  const allRows = (rows ?? []) as any[]

  function exportCSV() {
    const headers = [
      'Nombre',
      'Departamento',
      'Fecha',
      'Tiempo activo',
      'Productividad',
      'Horas extra',
    ]
    const data = allRows.map((r: any) => [
      r.full_name ?? r.email,
      r.department ?? '',
      r.metric_date,
      fmtHours(r.active_seconds),
      `${Math.round(r.productivity_ratio * 100)}%`,
      r.overtime_seconds > 60 ? fmtHours(r.overtime_seconds) : '0',
    ])
    const csv =
      '﻿' +
      [headers, ...data]
        .map((r) => r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-${dateFrom}-${dateTo}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const byPerson = allRows.reduce((acc: Record<string, any[]>, r: any) => {
    const key = r.user_id
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Timesheet del equipo</h2>
          <p className="mt-0.5 text-sm text-gray-500">Vista consolidada de asistencia y horas</p>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(['person', 'date'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupBy(g)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${groupBy === g ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {{ person: 'Por persona', date: 'Por fecha' }[g]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay datos para el período seleccionado</p>
        </div>
      ) : groupBy === 'person' ? (
        <div className="space-y-4">
          {Object.entries(byPerson).map(([uid, userRows]: [string, any[]]) => {
            const first = userRows[0]
            const totalActive = userRows.reduce((s: number, r: any) => s + r.active_seconds, 0)
            const totalOvertime = userRows.reduce((s: number, r: any) => s + r.overtime_seconds, 0)
            const avgProd =
              userRows.length > 0
                ? Math.round(
                    (userRows.reduce((s: number, r: any) => s + r.productivity_ratio, 0) /
                      userRows.length) *
                      100,
                  )
                : 0
            return (
              <div key={uid} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    {(first.full_name ?? first.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800">
                      {first.full_name ?? first.email}
                    </span>
                    {first.department && (
                      <span className="ml-2 text-xs text-gray-400">{first.department}</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>
                      <span className="font-medium text-gray-700">{fmtHours(totalActive)}</span>{' '}
                      activo
                    </span>
                    <span>
                      <span className="font-medium text-gray-700">{avgProd}%</span> prod.
                    </span>
                    {totalOvertime > 0 && (
                      <span>
                        <span className="font-medium text-orange-600">
                          {fmtHours(totalOvertime)}
                        </span>{' '}
                        extra
                      </span>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {userRows.map((r: any) => (
                    <div key={r.metric_date} className="flex items-center gap-4 px-4 py-2 text-xs">
                      <span className="w-24 text-gray-400">
                        {new Date(r.metric_date + 'T12:00:00').toLocaleDateString('es-CO', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                      <span className="w-20 font-medium text-gray-700">
                        {fmtHours(r.active_seconds)}
                      </span>
                      <span
                        className={`w-16 ${r.productivity_ratio >= 0.7 ? 'text-green-600' : r.productivity_ratio >= 0.4 ? 'text-yellow-600' : 'text-red-500'}`}
                      >
                        {Math.round(r.productivity_ratio * 100)}%
                      </span>
                      {r.overtime_seconds > 60 && (
                        <span className="text-orange-500">
                          {fmtHours(r.overtime_seconds)} extra
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Persona</th>
                <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                <th className="px-4 py-2.5 text-right font-medium">Activo</th>
                <th className="px-4 py-2.5 text-right font-medium">Productividad</th>
                <th className="px-4 py-2.5 text-right font-medium">Extra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {allRows.map((r: any) => (
                <tr key={`${r.user_id}-${r.metric_date}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">{r.full_name ?? r.email}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(r.metric_date + 'T12:00:00').toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">
                    {fmtHours(r.active_seconds)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right ${r.productivity_ratio >= 0.7 ? 'text-green-600' : r.productivity_ratio >= 0.4 ? 'text-yellow-600' : 'text-red-500'}`}
                  >
                    {Math.round(r.productivity_ratio * 100)}%
                  </td>
                  <td className="px-4 py-2 text-right text-orange-500">
                    {r.overtime_seconds > 60 ? fmtHours(r.overtime_seconds) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
