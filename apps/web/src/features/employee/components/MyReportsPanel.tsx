'use client'

import { useState, useCallback } from 'react'
import { trpc } from '@/lib/trpc-client'
import { FileText, Download, Calendar } from 'lucide-react'

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

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

type Mode = 'week' | 'month'

function getWeekRange() {
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    startDate: mon.toISOString().slice(0, 10),
    endDate: sun.toISOString().slice(0, 10),
  }
}

function getMonthRange(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10)
  return { startDate, endDate }
}

export function MyReportsPanel() {
  const today = new Date()
  const [mode, setMode] = useState<Mode>('month')
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [generating, setGenerating] = useState(false)

  const { startDate, endDate } = mode === 'week' ? getWeekRange() : getMonthRange(year, month)

  const { data, isLoading } = trpc.employee.getMyReport.useQuery({ startDate, endDate })

  const downloadPDF = useCallback(async () => {
    if (!data) return
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const W = 210
      const margin = 18
      let y = 20

      // Header band
      doc.setFillColor(30, 64, 175)
      doc.rect(0, 0, W, 38, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('BCWork', margin, 16)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Informe de actividad laboral', margin, 24)
      doc.setFontSize(9)
      const periodLabel =
        mode === 'week' ? `Semana: ${startDate} — ${endDate}` : `${MONTH_NAMES[month - 1]} ${year}`
      doc.text(periodLabel, margin, 32)
      doc.setTextColor(0, 0, 0)
      y = 50

      // Employee info
      if (data.profile) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(data.profile.full_name ?? 'Empleado', margin, y)
        y += 6
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        if (data.profile.department) doc.text(`Departamento: ${data.profile.department}`, margin, y)
        if (data.profile.position) doc.text(`Cargo: ${data.profile.position}`, margin + 60, y)
        doc.text(data.profile.email ?? '', margin + 120, y)
        doc.setTextColor(0, 0, 0)
        y += 10
      }

      // Divider
      doc.setDrawColor(220, 220, 220)
      doc.line(margin, y, W - margin, y)
      y += 8

      // Summary boxes
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumen del período', margin, y)
      y += 6

      const boxes = [
        { label: 'Días trabajados', value: String(data.summary.workDays) },
        { label: 'Horas totales', value: fmtHours(data.summary.totalActiveSecs) },
        { label: 'Horas extra', value: fmtHours(data.summary.totalOvertimeSecs) },
        { label: 'Productividad', value: `${data.summary.avgProductivity}%` },
      ]
      const bw = (W - margin * 2 - 9) / 4
      boxes.forEach((b, i) => {
        const bx = margin + i * (bw + 3)
        doc.setFillColor(245, 247, 250)
        doc.roundedRect(bx, y, bw, 18, 2, 2, 'F')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(120, 120, 120)
        doc.text(b.label, bx + bw / 2, y + 5, { align: 'center' })
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 64, 175)
        doc.text(b.value, bx + bw / 2, y + 13, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      })
      y += 24

      // Daily activity bar chart (simple)
      if (data.dailyMetrics.length > 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Actividad diaria (horas)', margin, y)
        y += 5

        const chartH = 25
        const chartW = W - margin * 2
        const maxSecs = Math.max(...data.dailyMetrics.map((d) => d.activeSecs), 1)
        const barW = Math.max(1, chartW / data.dailyMetrics.length - 1)

        doc.setDrawColor(230, 230, 230)
        doc.setFillColor(230, 230, 230)
        doc.rect(margin, y, chartW, chartH, 'D')

        data.dailyMetrics.forEach((d, i) => {
          const bh = (d.activeSecs / maxSecs) * chartH
          const bx = margin + i * (barW + 1)
          if (d.overtimeSecs > 0) {
            doc.setFillColor(245, 158, 11)
          } else {
            doc.setFillColor(59, 130, 246)
          }
          doc.rect(bx, y + chartH - bh, barW, bh, 'F')
        })
        y += chartH + 8
      }

      // Project breakdown
      if (data.projectBreakdown.length > 0) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Tiempo por proyecto', margin, y)
        y += 5

        const totalProjSecs = data.projectBreakdown.reduce((s, p) => s + p.secs, 0)
        data.projectBreakdown.forEach((p) => {
          const pct = totalProjSecs > 0 ? Math.round((p.secs / totalProjSecs) * 100) : 0
          const barW = ((W - margin * 2 - 60) * pct) / 100
          doc.setFillColor(59, 130, 246)
          doc.rect(margin, y, barW, 4, 'F')
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.text(`${p.name}`, margin + barW + 2, y + 3.5)
          doc.setTextColor(100, 100, 100)
          doc.text(fmtHours(p.secs), W - margin - 20, y + 3.5, { align: 'right' })
          doc.text(`${pct}%`, W - margin, y + 3.5, { align: 'right' })
          doc.setTextColor(0, 0, 0)
          y += 7
        })
        y += 4
      }

      // Recent sessions table
      if (data.recentSessions.length > 0) {
        if (y > 230) {
          doc.addPage()
          y = 20
        }
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Sesiones recientes', margin, y)
        y += 5

        doc.setFillColor(30, 64, 175)
        doc.rect(margin, y, W - margin * 2, 6, 'F')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('Fecha', margin + 2, y + 4)
        doc.text('Ingreso', margin + 30, y + 4)
        doc.text('Salida', margin + 52, y + 4)
        doc.text('Trabajado', margin + 74, y + 4)
        doc.text('Ubicación', margin + 100, y + 4)
        doc.setTextColor(0, 0, 0)
        y += 7

        data.recentSessions.forEach((s, i) => {
          if (y > 270) {
            doc.addPage()
            y = 20
          }
          if (i % 2 === 0) {
            doc.setFillColor(248, 250, 252)
            doc.rect(margin, y - 1, W - margin * 2, 6, 'F')
          }
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.text(s.startedAt.slice(0, 10), margin + 2, y + 3)
          doc.text(fmtTime(s.startedAt), margin + 30, y + 3)
          doc.text(s.endedAt ? fmtTime(s.endedAt) : 'Activa', margin + 52, y + 3)
          doc.text(fmtHours(s.activeSecs), margin + 74, y + 3)
          doc.text(s.locationType ?? '—', margin + 100, y + 3)
          y += 6
        })
      }

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `BCWork — Generado el ${new Date().toLocaleDateString('es-CO')} — Página ${i} de ${pageCount}`,
          W / 2,
          290,
          { align: 'center' },
        )
      }

      const filename =
        mode === 'week'
          ? `informe_semana_${startDate}.pdf`
          : `informe_${year}_${String(month).padStart(2, '0')}.pdf`
      doc.save(filename)
    } finally {
      setGenerating(false)
    }
  }, [data, mode, month, year, startDate, endDate])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mis informes</h1>
          <p className="mt-0.5 text-sm text-gray-500">Descarga tu informe de actividad en PDF</p>
        </div>
        <button
          type="button"
          onClick={downloadPDF}
          disabled={!data || generating}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          {generating ? 'Generando…' : 'Descargar PDF'}
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(['week', 'month'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${mode === m ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {m === 'week' ? 'Esta semana' : 'Mensual'}
            </button>
          ))}
        </div>

        {mode === 'month' && (
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTH_NAMES.map((n, i) => (
                <option
                  key={i + 1}
                  value={i + 1}
                  disabled={year === today.getFullYear() && i + 1 > today.getMonth() + 1}
                >
                  {n}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[today.getFullYear(), today.getFullYear() - 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
          <Calendar className="mr-1 inline h-3 w-3" />
          {startDate} → {endDate}
        </span>
      </div>

      {/* Preview */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-28 rounded-2xl bg-gray-100" />
          <div className="h-40 rounded-xl bg-gray-100" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText className="h-4 w-4 text-blue-600" />
              Vista previa del informe
            </div>
            {data.profile && (
              <div className="mb-4 border-b border-gray-100 pb-4">
                <p className="font-semibold text-gray-900">{data.profile.full_name}</p>
                <p className="text-sm text-gray-500">
                  {data.profile.department} · {data.profile.position}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Días trabajados', value: String(data.summary.workDays) },
                { label: 'Horas totales', value: fmtHours(data.summary.totalActiveSecs) },
                { label: 'Horas extra', value: fmtHours(data.summary.totalOvertimeSecs) },
                { label: 'Productividad', value: `${data.summary.avgProductivity}%` },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-[11px] text-gray-500">{k.label}</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-blue-700">{k.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Activity chart preview */}
          {data.dailyMetrics.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Actividad diaria</h3>
              <div className="flex items-end gap-0.5" style={{ height: 60 }}>
                {data.dailyMetrics.map((d) => {
                  const maxSecs = Math.max(...data.dailyMetrics.map((x) => x.activeSecs), 1)
                  const h = Math.round((d.activeSecs / maxSecs) * 60)
                  return (
                    <div
                      key={d.date}
                      style={{ height: `${h}px` }}
                      title={`${d.date}: ${fmtHours(d.activeSecs)}`}
                      className={`min-w-0 flex-1 rounded-t-sm ${d.overtimeSecs > 0 ? 'bg-yellow-400' : 'bg-blue-400'}`}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Project breakdown */}
          {data.projectBreakdown.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Tiempo por proyecto</h3>
              <div className="space-y-2.5">
                {data.projectBreakdown.map((p) => {
                  const total = data.projectBreakdown.reduce((s, x) => s + x.secs, 0)
                  const pct = total > 0 ? Math.round((p.secs / total) * 100) : 0
                  return (
                    <div key={p.name}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{p.name}</span>
                        <span className="text-gray-500">
                          {fmtHours(p.secs)} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Sin datos para el período seleccionado</p>
        </div>
      )}
    </div>
  )
}
