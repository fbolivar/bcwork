'use client'

import { useState, useCallback } from 'react'
import { Download, Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

function horas(secs: number) {
  return `${(secs / 3600).toFixed(1)} h`
}
function pct(r: number | null) {
  return r === null ? '—' : `${Math.round(r * 100)}%`
}

/** Semáforo sobre lo pactado. Por encima de 100% no es "mejor": es horas de más. */
function colorCumplimiento(r: number | null) {
  if (r === null) return 'text-gray-400'
  if (r < 0.8) return 'text-red-600'
  if (r > 1.1) return 'text-orange-600'
  return 'text-green-700'
}

function Delta({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-[10px] text-gray-300">sin comparación</span>
  const pp = Math.round(delta * 100)
  if (pp === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
        <Minus className="h-3 w-3" /> igual
      </span>
    )
  const sube = pp > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] ${sube ? 'text-green-600' : 'text-red-600'}`}
    >
      {sube ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {sube ? '+' : ''}
      {pp} pp
    </span>
  )
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}
function haceDias(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
}

export function ComplianceReportPanel() {
  const [from, setFrom] = useState(() => haceDias(6))
  const [to, setTo] = useState(hoy)
  const [pdfBusy, setPdfBusy] = useState(false)

  const { data, isLoading } = trpc.admin.getComplianceReport.useQuery({ from, to })

  const exportarPdf = useCallback(async () => {
    if (!data) return
    setPdfBusy(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210
      const margin = 18

      // Mismo membrete que el informe del empleado, para que los documentos que
      // salen de BCWork se vean como una familia.
      doc.setFillColor(30, 64, 175)
      doc.rect(0, 0, W, 38, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('BCWork', margin, 16)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Cumplimiento de jornada', margin, 24)
      doc.setFontSize(9)
      doc.text(`Período: ${data.from} — ${data.to}`, margin, 32)

      const c = data.company
      if (c) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text(c.legal_name ?? c.trade_name ?? '', W - margin, 25, { align: 'right' })
        if (c.nit) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(210, 220, 240)
          doc.text(`NIT ${c.nit}`, W - margin, 30, { align: 'right' })
        }
      }

      doc.setTextColor(0, 0, 0)
      let y = 50

      const t = data.totals
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumen del equipo', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(
        `Cumplimiento global: ${pct(t.complianceRatio)}   ·   Esperadas: ${horas(t.expectedSeconds)}   ·   Registradas: ${horas(t.activeSeconds)}`,
        margin,
        y,
      )
      y += 5
      doc.text(
        `Jornadas incompletas: ${t.incompleteDays}   ·   Personas bajo el 80%: ${t.peopleBelow80}   ·   Horas extra: ${horas(t.overtimeSeconds)}`,
        margin,
        y,
      )
      y += 10

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Colaborador', margin, y)
      doc.text('Esperadas', margin + 72, y, { align: 'right' })
      doc.text('Reales', margin + 100, y, { align: 'right' })
      doc.text('Cumpl.', margin + 126, y, { align: 'right' })
      doc.text('vs ant.', margin + 150, y, { align: 'right' })
      doc.text('Incompl.', margin + 174, y, { align: 'right' })
      y += 2
      doc.setDrawColor(200)
      doc.line(margin, y, W - margin, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      for (const p of data.people) {
        if (y > 275) {
          doc.addPage()
          y = 20
        }
        doc.text(String(p.fullName).slice(0, 34), margin, y)
        doc.text(horas(p.expectedSeconds), margin + 72, y, { align: 'right' })
        doc.text(horas(p.activeSeconds), margin + 100, y, { align: 'right' })
        doc.text(pct(p.complianceRatio), margin + 126, y, { align: 'right' })
        doc.text(
          p.delta === null ? '—' : `${p.delta > 0 ? '+' : ''}${Math.round(p.delta * 100)} pp`,
          margin + 150,
          y,
          { align: 'right' },
        )
        doc.text(String(p.incompleteDays), margin + 174, y, { align: 'right' })
        y += 6
      }

      y += 6
      doc.setFontSize(7.5)
      doc.setTextColor(120)
      const nota =
        'El cumplimiento compara el tiempo con actividad registrada contra la jornada pactada en BCWork. ' +
        'No mide el trabajo realizado ni sustituye la valoracion del jefe inmediato. ' +
        `Comparación contra el período ${data.previousFrom} — ${data.previousTo}.`
      doc.text(doc.splitTextToSize(nota, W - margin * 2), margin, y)

      doc.save(`cumplimiento-jornada-${data.from}_${data.to}.pdf`)
    } finally {
      setPdfBusy(false)
    }
  }, [data])

  const t = data?.totals

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Cumplimiento de jornada</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Tiempo con actividad registrada frente a la jornada pactada, por colaborador y
              comparado con el período anterior.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
            />
            <span className="text-xs text-gray-400">a</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={exportarPdf}
              disabled={pdfBusy || !data || data.people.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pdfBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              PDF
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : !data || data.people.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            Sin métricas en el período. Se calculan cada hora a partir de la actividad de los
            agentes.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Cumplimiento global
                </p>
                <p className={`text-xl font-bold ${colorCumplimiento(t!.complianceRatio)}`}>
                  {pct(t!.complianceRatio)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Esperadas / reales
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {horas(t!.expectedSeconds)} / {horas(t!.activeSeconds)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Jornadas incompletas
                </p>
                <p className="text-xl font-bold text-gray-900">{t!.incompleteDays}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Horas extra
                </p>
                <p className="text-xl font-bold text-gray-900">{horas(t!.overtimeSeconds)}</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[10px] uppercase tracking-wide text-gray-400">
                    <th className="pb-2 font-semibold">Colaborador</th>
                    <th className="pb-2 text-right font-semibold">Esperadas</th>
                    <th className="pb-2 text-right font-semibold">Reales</th>
                    <th className="pb-2 text-right font-semibold">Cumplimiento</th>
                    <th className="pb-2 text-right font-semibold">vs anterior</th>
                    <th className="pb-2 text-right font-semibold">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {data.people.map((p) => (
                    <tr key={p.userId} className="border-b border-gray-50 last:border-0">
                      <td className="py-2">
                        <span className="font-medium text-gray-800">{p.fullName}</span>
                        {p.department && (
                          <span className="ml-2 text-[10px] text-gray-400">{p.department}</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-gray-600">{horas(p.expectedSeconds)}</td>
                      <td className="py-2 text-right text-gray-600">{horas(p.activeSeconds)}</td>
                      <td
                        className={`py-2 text-right font-bold ${colorCumplimiento(p.complianceRatio)}`}
                      >
                        {pct(p.complianceRatio)}
                      </td>
                      <td className="py-2 text-right">
                        <Delta delta={p.delta} />
                      </td>
                      <td className="py-2 text-right text-gray-500">
                        {p.daysWithData}
                        {p.incompleteDays > 0 && (
                          <span className="ml-1 text-[10px] text-red-500">
                            ({p.incompleteDays} incompl.)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Compara contra el período {data.previousFrom} — {data.previousTo}. El cumplimiento
              mide tiempo con actividad frente a la jornada pactada: no mide el trabajo realizado.
            </p>
          </>
        )}
      </div>

      {/* Excepciones: un jefe no reporta promedios, reporta lo que se salió de lo normal. */}
      {data && data.people.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-900">Excepciones del período</h2>
          </div>
          {(() => {
            const bajo = data.people.filter(
              (p) => p.complianceRatio !== null && p.complianceRatio < 0.8,
            )
            const sobre = data.people.filter(
              (p) => p.complianceRatio !== null && p.complianceRatio > 1.1,
            )
            const extra = data.people.filter((p) => p.overtimeSeconds > 0)
            if (bajo.length === 0 && sobre.length === 0 && extra.length === 0) {
              return (
                <p className="text-sm text-gray-500">
                  Nadie por debajo del 80% ni por encima del 110% de su jornada. Sin horas extra.
                </p>
              )
            }
            return (
              <ul className="space-y-2 text-sm">
                {bajo.map((p) => (
                  <li key={`b-${p.userId}`} className="flex items-baseline gap-2">
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                      bajo
                    </span>
                    <span className="text-gray-800">{p.fullName}</span>
                    <span className="text-gray-500">
                      {pct(p.complianceRatio)} de su jornada · {p.incompleteDays} día(s)
                      incompleto(s)
                    </span>
                  </li>
                ))}
                {sobre.map((p) => (
                  <li key={`s-${p.userId}`} className="flex items-baseline gap-2">
                    <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-orange-700">
                      exceso
                    </span>
                    <span className="text-gray-800">{p.fullName}</span>
                    <span className="text-gray-500">
                      {pct(p.complianceRatio)} — más horas de las pactadas
                    </span>
                  </li>
                ))}
                {extra.map((p) => (
                  <li key={`e-${p.userId}`} className="flex items-baseline gap-2">
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                      extra
                    </span>
                    <span className="text-gray-800">{p.fullName}</span>
                    <span className="text-gray-500">
                      {horas(p.overtimeSeconds)} en {p.daysWithOvertime} día(s)
                    </span>
                  </li>
                ))}
              </ul>
            )
          })()}
        </div>
      )}
    </div>
  )
}
