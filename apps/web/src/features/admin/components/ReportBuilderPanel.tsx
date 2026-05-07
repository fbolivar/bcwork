'use client'

import { useState } from 'react'
import { trpc as api } from '@/lib/trpc-client'
import { BarChart2, Download, Play, Calendar } from 'lucide-react'

type ReportType = 'overview' | 'attendance' | 'productivity' | 'absences' | 'payroll'

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  {
    value: 'overview',
    label: 'Resumen general',
    description: 'Horas + productividad por empleado',
  },
  { value: 'attendance', label: 'Asistencia', description: 'Sesiones de trabajo detalladas' },
  {
    value: 'productivity',
    label: 'Productividad',
    description: 'Métricas diarias de productividad',
  },
  { value: 'absences', label: 'Ausencias', description: 'Todas las ausencias aprobadas' },
  { value: 'payroll', label: 'Nómina', description: 'Colillas de pago del período' },
]

function toISO(date: string) {
  return date ? new Date(date).toISOString() : ''
}

function downloadCSV(rows: unknown[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0] as object).filter(
    (k) => typeof (rows[0] as Record<string, unknown>)[k] !== 'object',
  )
  const header = keys.join(',')
  const lines = rows.map((r) =>
    keys
      .map((k) => {
        const v = (r as Record<string, unknown>)[k]
        const s = v == null ? '' : String(v)
        return s.includes(',') ? `"${s}"` : s
      })
      .join(','),
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportBuilderPanel() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const [reportType, setReportType] = useState<ReportType>('overview')
  const [dateFrom, setDateFrom] = useState(firstDay.toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10))
  const [enabled, setEnabled] = useState(false)

  const { data, isFetching, refetch } = api.admin.runCustomReport.useQuery(
    { report_type: reportType, date_from: toISO(dateFrom), date_to: toISO(dateTo) },
    { enabled },
  )

  function run() {
    setEnabled(true)
    void refetch()
  }

  const rows = (data?.rows ?? []) as Record<string, unknown>[]

  const firstRow = rows[0]
  const columns =
    firstRow != null ? Object.keys(firstRow).filter((k) => typeof firstRow[k] !== 'object') : []

  const COLUMN_LABELS: Record<string, string> = {
    user_id: 'ID',
    full_name: 'Nombre',
    department: 'Departamento',
    position: 'Cargo',
    total_hours: 'Horas',
    avg_productivity: 'Productividad %',
    date: 'Fecha',
    productive_seconds: 'Segundos productivos',
    duration_seconds: 'Duración (s)',
    started_at: 'Inicio',
    ended_at: 'Fin',
    start_date: 'Inicio ausencia',
    end_date: 'Fin ausencia',
    type: 'Tipo',
    status: 'Estado',
    period_label: 'Período',
    gross_amount: 'Bruto',
    deductions: 'Deducciones',
    net_amount: 'Neto',
  }

  return (
    <div className="space-y-5">
      {/* Configuración */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Configurar informe</h3>
        </div>

        {/* Selector de tipo */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => {
                setReportType(rt.value)
                setEnabled(false)
              }}
              className={`rounded-lg border p-3 text-left transition-colors ${
                reportType === rt.value
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-100 hover:bg-gray-50'
              }`}
            >
              <p
                className={`text-xs font-semibold ${reportType === rt.value ? 'text-blue-700' : 'text-gray-700'}`}
              >
                {rt.label}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-400">{rt.description}</p>
            </button>
          ))}
        </div>

        {/* Rango de fechas */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              <Calendar className="mr-1 inline h-3 w-3" />
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setEnabled(false)
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setEnabled(false)
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <button
            type="button"
            onClick={run}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {isFetching ? 'Generando...' : 'Generar'}
          </button>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCSV(rows, `bcwork-${reportType}-${dateFrom}-${dateTo}.csv`)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabla de resultados */}
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <div className="border-b border-gray-50 px-5 py-3">
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{rows.length}</span> registros
              encontrados
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400"
                    >
                      {COLUMN_LABELS[col] ?? col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    {columns.map((col) => {
                      const v = row[col]
                      let display = v == null ? '—' : String(v)
                      if (col.includes('_at') || col === 'date') {
                        try {
                          display = new Date(display).toLocaleDateString('es-CO')
                        } catch {}
                      }
                      return (
                        <td key={col} className="px-4 py-2 text-gray-700">
                          {display}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 200 && (
            <div className="border-t border-gray-50 px-5 py-2 text-center text-xs text-gray-400">
              Mostrando 200 de {rows.length} registros. Exporta CSV para ver todos.
            </div>
          )}
        </div>
      )}

      {enabled && !isFetching && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
          <BarChart2 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Sin datos para el período seleccionado</p>
        </div>
      )}
    </div>
  )
}
