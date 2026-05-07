'use client'

import { useState, useRef } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Download, FileText, FileSpreadsheet, Printer } from 'lucide-react'

const REPORT_TYPES = [
  { value: 'timesheet', label: 'Timesheet', description: 'Horas trabajadas por empleado' },
  { value: 'absences', label: 'Ausencias', description: 'Solicitudes de ausencia del período' },
  { value: 'compensation', label: 'Compensación', description: 'Cambios salariales del período' },
  { value: 'benefits', label: 'Beneficios', description: 'Beneficios activos del equipo' },
  { value: 'evaluations', label: 'Evaluaciones', description: 'Revisiones de desempeño' },
] as const

type ReportType = (typeof REPORT_TYPES)[number]['value']

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') {
    if (Number.isFinite(v)) return v.toLocaleString('es-CO')
  }
  return String(v)
}

function getDefaultDates() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export function ReportExportPanel() {
  const defaults = getDefaultDates()
  const [reportType, setReportType] = useState<ReportType>('timesheet')
  const [dateFrom, setDateFrom] = useState(defaults.from)
  const [dateTo, setDateTo] = useState(defaults.to)
  const [enabled, setEnabled] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  const { data, isFetching } = trpc.manager.getReportData.useQuery(
    { type: reportType, date_from: dateFrom, date_to: dateTo },
    { enabled },
  )

  function generateReport() {
    setEnabled(true)
  }

  function exportCSV() {
    if (!data) return
    const header = data.columns.join(',')
    const body = data.rows
      .map((row: any) =>
        Object.values(row)
          .map((v) => `"${fmtVal(v)}"`)
          .join(','),
      )
      .join('\n')
    const csv = `${header}\n${body}`
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${reportType}-${dateFrom}-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    if (!tableRef.current) return
    const win = window.open('', '_blank')
    if (!win) return
    const selected = REPORT_TYPES.find((r) => r.value === reportType)
    win.document.write(`
      <html>
        <head>
          <title>Reporte ${selected?.label ?? reportType} — BCWork</title>
          <style>
            body { font-family: sans-serif; font-size: 11px; color: #111; padding: 20px; }
            h1 { font-size: 16px; margin-bottom: 4px; }
            p { margin: 0 0 16px; color: #666; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f3f4f6; text-align: left; padding: 6px 10px; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
            td { padding: 5px 10px; border-bottom: 1px solid #f3f4f6; }
            tr:nth-child(even) td { background: #fafafa; }
          </style>
        </head>
        <body>
          <h1>Reporte: ${selected?.label ?? reportType}</h1>
          <p>Período: ${dateFrom} al ${dateTo}</p>
          ${tableRef.current.innerHTML}
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  const selectedType = REPORT_TYPES.find((r) => r.value === reportType)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Exportar reportes</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Genera y descarga reportes del equipo en CSV o PDF
        </p>
      </div>

      {/* Config */}
      <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-4">
        {/* Report type pills */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-700">Tipo de reporte</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_TYPES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  setReportType(r.value)
                  setEnabled(false)
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  reportType === r.value
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {selectedType && (
            <p className="mt-1.5 text-[11px] text-gray-400">{selectedType.description}</p>
          )}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setEnabled(false)
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setEnabled(false)
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={generateReport}
          disabled={isFetching}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isFetching ? 'Generando...' : 'Generar reporte'}
        </button>
      </div>

      {/* Results */}
      {data && !isFetching && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{data.rows.length}</span> registros
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportCSV}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={printReport}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Printer className="h-3.5 w-3.5 text-blue-600" />
                Imprimir / PDF
              </button>
            </div>
          </div>

          {data.rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Sin datos para el período seleccionado</p>
            </div>
          ) : (
            <div ref={tableRef} className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    {data.columns.map((col: string) => (
                      <th key={col} className="whitespace-nowrap px-3 py-2.5 text-left font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {data.rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {Object.values(row).map((v: any, j: number) => (
                        <td key={j} className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">
                          {fmtVal(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="text-[10px] text-gray-400">
        <Download className="mr-1 inline h-3 w-3" />
        CSV compatible con Excel, Google Sheets y LibreOffice. PDF disponible vía imprimir del
        navegador → Guardar como PDF.
      </p>
    </div>
  )
}
