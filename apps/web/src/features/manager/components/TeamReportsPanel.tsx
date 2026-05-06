'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { FileText, Download, TrendingUp, Clock, Users } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function getDefaultRange() {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), 1)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export function TeamReportsPanel() {
  const range = getDefaultRange()
  const [dateFrom, setDateFrom] = useState(range.from)
  const [dateTo, setDateTo] = useState(range.to)

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id

  const { data: report, isLoading } = trpc.manager.getTeamReportData.useQuery({
    teamId,
    dateFrom,
    dateTo,
  })

  const users = (report?.users ?? []) as any[]
  const totalActive = users.reduce((s: number, u: any) => s + u.active_seconds, 0)
  const totalOvertime = users.reduce((s: number, u: any) => s + u.overtime_seconds, 0)
  const avgProd =
    users.length > 0
      ? Math.round(
          (users.reduce((s: number, u: any) => s + u.productivity_ratio, 0) / users.length) * 100,
        )
      : 0

  function exportCSV() {
    const headers = [
      'Nombre',
      'Email',
      'Departamento',
      'Cargo',
      'Días activos',
      'Tiempo activo',
      'Productividad',
      'Horas extra',
    ]
    const rows = users.map((u: any) => [
      u.full_name ?? '',
      u.email,
      u.department ?? '',
      u.position ?? '',
      String(u.days_active),
      fmtHours(u.active_seconds),
      `${Math.round(u.productivity_ratio * 100)}%`,
      u.overtime_seconds > 60 ? fmtHours(u.overtime_seconds) : '0',
    ])
    const csv =
      '﻿' +
      [headers, ...rows]
        .map((r) => r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-equipo-${dateFrom}-${dateTo}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reportes del equipo</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Resumen de productividad y horas por período
          </p>
        </div>
        {users.length > 0 && (
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        )}
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
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay datos para el período seleccionado</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                <Users className="h-3.5 w-3.5" /> Miembros activos
              </div>
              <p className="mt-1 text-2xl font-bold text-blue-700">{users.length}</p>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <TrendingUp className="h-3.5 w-3.5" /> Productividad promedio
              </div>
              <p className="mt-1 text-2xl font-bold text-green-700">{avgProd}%</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600">
                <Clock className="h-3.5 w-3.5" /> Total horas extra
              </div>
              <p className="mt-1 text-2xl font-bold text-orange-700">{fmtHours(totalOvertime)}</p>
              <p className="mt-0.5 text-xs text-orange-400">{fmtHours(totalActive)} activo total</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Empleado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Días</th>
                  <th className="px-4 py-2.5 text-right font-medium">Tiempo activo</th>
                  <th className="px-4 py-2.5 text-right font-medium">Productividad</th>
                  <th className="px-4 py-2.5 text-right font-medium">Horas extra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {users.map((u: any) => (
                  <tr key={u.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{u.full_name ?? u.email}</p>
                      {u.department && <p className="text-xs text-gray-400">{u.department}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{u.days_active}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">
                      {fmtHours(u.active_seconds)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${u.productivity_ratio >= 0.7 ? 'text-green-600' : u.productivity_ratio >= 0.4 ? 'text-yellow-600' : 'text-red-500'}`}
                    >
                      {Math.round(u.productivity_ratio * 100)}%
                    </td>
                    <td className="px-4 py-3 text-right text-orange-500">
                      {u.overtime_seconds > 60 ? fmtHours(u.overtime_seconds) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
