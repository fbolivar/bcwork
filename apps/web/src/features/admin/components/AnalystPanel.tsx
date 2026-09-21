'use client'

import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  Sparkles,
  RefreshCw,
  Download,
  Copy,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Send,
  History,
} from 'lucide-react'
import { MarkdownLite } from '@/features/shared/MarkdownLite'
import { Sparkline } from '@/features/shared/panel-widgets'
import { COLOR } from './panel-identidad'
import type { Hechos, PersonaHechos, Senal, Severidad } from '@/server/analyst'
import type { Informe } from '@/server/analyst-ai'

/**
 * Analista IA: un análisis por periodo (2 a 12 semanas, comparado con el
 * anterior) con resumen ejecutivo, señales, lectura por persona,
 * recomendaciones e informe para gerencia. Los hechos siempre se muestran;
 * la interpretación aparece cuando hay clave de IA.
 */

type Analisis = {
  id: string
  createdAt: string
  weeks: number
  model: string | null
  error: string | null
  facts: Hechos
  report: Informe | null
}

const SEV: Record<Severidad, { chip: string; punto: string; label: string }> = {
  alta: { chip: 'bg-red-50 text-red-700 border-red-200', punto: 'bg-red-500', label: 'Alta' },
  media: {
    chip: 'bg-orange-50 text-orange-700 border-orange-200',
    punto: 'bg-orange-500',
    label: 'Media',
  },
  baja: { chip: 'bg-gray-50 text-gray-600 border-gray-200', punto: 'bg-gray-400', label: 'Baja' },
  positiva: {
    chip: 'bg-green-50 text-green-700 border-green-200',
    punto: 'bg-green-500',
    label: 'Positiva',
  },
}

function fecha(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function r1(v: number) {
  return Math.round(v * 10) / 10
}

function n(v: number | null, suf = '') {
  return v === null || v === undefined ? '—' : `${v}${suf}`
}

function Delta({
  actual,
  previo,
  unidad,
  invertir = false,
}: {
  actual: number | null
  previo: number | null
  unidad: string
  invertir?: boolean
}) {
  if (actual === null || previo === null)
    return <span className="text-gray-400">sin comparación</span>
  const d = Math.round((actual - previo) * 10) / 10
  if (Math.abs(d) < 0.05)
    return <span className="text-gray-400">igual que el periodo anterior</span>
  const bueno = invertir ? d < 0 : d > 0
  const Icono = d > 0 ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 ${bueno ? 'text-green-600' : 'text-red-600'}`}>
      <Icono className="h-3.5 w-3.5" />
      {d > 0 ? '+' : ''}
      {d}
      {unidad} vs. periodo anterior
    </span>
  )
}

function Tendencia({ t }: { t: 'sube' | 'baja' | 'estable' | null }) {
  if (t === 'sube') return <TrendingUp className="h-4 w-4 text-green-600" />
  if (t === 'baja') return <TrendingDown className="h-4 w-4 text-red-600" />
  if (t === 'estable') return <Minus className="h-4 w-4 text-gray-400" />
  return <span className="text-xs text-gray-300">—</span>
}

export function AnalystPanel() {
  const utils = trpc.useUtils()
  const { data: estado } = trpc.admin.analystStatus.useQuery()
  const { data: historial } = trpc.admin.listAnalyses.useQuery()
  const [weeks, setWeeks] = useState(4)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [actual, setActual] = useState<Analisis | null>(null)

  const detalle = trpc.admin.getAnalysis.useQuery(
    { id: seleccionado ?? '' },
    { enabled: !!seleccionado },
  )
  useEffect(() => {
    if (detalle.data) setActual(detalle.data as Analisis)
  }, [detalle.data])
  useEffect(() => {
    if (!seleccionado && historial?.[0]) setSeleccionado(historial[0].id)
  }, [historial, seleccionado])

  const correr = trpc.admin.runAnalysis.useMutation({
    onSuccess: (r) => {
      setActual({
        id: r.id,
        createdAt: r.createdAt,
        weeks,
        model: r.report ? (estado?.model ?? null) : null,
        error: r.error,
        facts: r.facts,
        report: r.report,
      })
      setSeleccionado(r.id)
      void utils.admin.listAnalyses.invalidate()
    },
  })

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Analista IA
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Comportamiento, tendencias y riesgos del equipo, con un informe listo para gerencia
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {[2, 4, 8, 12].map((w) => (
              <option key={w} value={w}>
                Últimas {w} semanas
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => correr.mutate({ weeks })}
            disabled={correr.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${correr.isPending ? 'animate-spin' : ''}`} />
            {correr.isPending ? 'Analizando…' : 'Generar análisis'}
          </button>
        </div>
      </div>

      {estado && !estado.aiConfigured && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            La interpretación con IA no está activa todavía: falta la clave del proveedor. Mientras
            tanto el análisis muestra los hechos y las señales calculadas por BCWork.
          </p>
        </div>
      )}
      {correr.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {correr.error.message}
        </div>
      )}

      {/* Historial */}
      {historial && historial.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <History className="h-3.5 w-3.5" />
          <span>Análisis anteriores:</span>
          {historial.slice(0, 8).map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setSeleccionado(h.id)}
              className={`rounded-full border px-2.5 py-1 ${
                h.id === actual?.id
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {fecha(h.period_from)} – {fecha(h.period_to)} · {fechaHora(h.created_at)}
              {!h.model && ' · sin IA'}
            </button>
          ))}
        </div>
      )}

      {correr.isPending && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Calculando hechos y redactando el informe. Suele tardar entre 20 y 60 segundos.
        </div>
      )}

      {!correr.isPending && !actual && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-blue-500" />
          <p className="mt-3 text-sm font-medium text-gray-900">Aún no hay análisis</p>
          <p className="mt-1 text-sm text-gray-500">
            Elige el periodo y pulsa «Generar análisis». Compara el periodo con el anterior, marca
            señales por persona y redacta un informe para gerencia.
          </p>
        </div>
      )}

      {!correr.isPending && actual && <Resultado a={actual} />}
    </div>
  )
}

function Resultado({ a }: { a: Analisis }) {
  const f = a.facts
  const r = a.report
  const c = f.totals.current
  const p = f.totals.previous
  const [copiado, setCopiado] = useState(false)

  const informeTexto = useMemo(() => r?.informe_gerencia ?? informeSinIa(f), [r, f])

  async function copiar() {
    await navigator.clipboard.writeText(informeTexto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  async function descargarPdf() {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const margen = 18
    const ancho = 210 - margen * 2
    let y = 20
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(`Informe de comportamiento del equipo — ${f.company}`, margen, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(110)
    doc.text(
      `Periodo ${fecha(f.period.from)} – ${fecha(f.period.to)} (${f.period.weeks} semanas) · comparado con ${fecha(f.period.previousFrom)} – ${fecha(f.period.previousTo)} · Generado por BCWork el ${fechaHora(a.createdAt)}`,
      margen,
      y,
      { maxWidth: ancho },
    )
    y += 12
    doc.setTextColor(30)
    for (const linea of informeTexto.replace(/\r\n/g, '\n').split('\n')) {
      const t = linea.trim()
      if (!t) {
        y += 2
        continue
      }
      const h = /^(#{1,4})\s+(.*)$/.exec(t)
      const item = /^[-*]\s+(.*)$/.exec(t) ?? /^\d+[.)]\s+(.*)$/.exec(t)
      let texto = (h ? h[2]! : item ? `• ${item[1]}` : t).replace(/\*\*/g, '')
      if (t.startsWith('|')) {
        if (/^\|?\s*:?-+/.test(t)) continue
        texto = t
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((x) => x.trim())
          .join('   ')
      }
      doc.setFont('helvetica', h ? 'bold' : 'normal')
      doc.setFontSize(h ? 12 : 10)
      const lineas = doc.splitTextToSize(texto, item ? ancho - 4 : ancho) as string[]
      for (const l of lineas) {
        if (y > 280) {
          doc.addPage()
          y = 20
        }
        doc.text(l, margen + (item ? 4 : 0), y)
        y += h ? 6 : 5
      }
      if (h) y += 1
    }
    doc.save(`bcwork-analisis-${f.period.from}-${f.period.to}.pdf`)
  }

  const personasIa = new Map((r?.personas ?? []).map((x) => [x.userId, x]))

  return (
    <div className="space-y-6">
      {/* Resumen ejecutivo */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Resumen ejecutivo
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {fecha(f.period.from)} – {fecha(f.period.to)} · {f.people} personas · comparado con{' '}
              {fecha(f.period.previousFrom)} – {fecha(f.period.previousTo)}
              {a.model && ` · ${a.model}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copiar}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? 'Copiado' : 'Copiar informe'}
            </button>
            <button
              type="button"
              onClick={descargarPdf}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar PDF
            </button>
          </div>
        </div>
        {r ? (
          <p className="mt-4 text-sm leading-relaxed text-gray-800">{r.resumen_ejecutivo}</p>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            {a.error ?? 'Sin interpretación disponible para este análisis.'}
          </p>
        )}
      </section>

      {/* Indicadores */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          titulo="Horas activas por día"
          valor={n(c.activeHoursPerDay, ' h')}
          delta={<Delta actual={c.activeHoursPerDay} previo={p.activeHoursPerDay} unidad=" h" />}
          spark={f.weekly.map((w) => w.activeHoursPerDay)}
          fill={COLOR.sparkNeutro}
        />
        <Indicador
          titulo="Productividad"
          valor={n(c.productivityPct, '%')}
          delta={<Delta actual={c.productivityPct} previo={p.productivityPct} unidad=" pp" />}
          spark={f.weekly.map((w) => w.productivityPct)}
          fill={COLOR.sparkOk}
        />
        <Indicador
          titulo="Jornadas con retraso"
          valor={n(c.latePct, '%')}
          delta={<Delta actual={c.latePct} previo={p.latePct} unidad=" pp" invertir />}
          spark={f.weekly.map((w) => w.latePct)}
          fill={COLOR.sparkMal}
        />
        <Indicador
          titulo="Fuera de horario"
          valor={`${r1(c.offHoursHours + c.weekendHours)} h`}
          delta={
            <Delta
              actual={r1(c.offHoursHours + c.weekendHours)}
              previo={r1(p.offHoursHours + p.weekendHours)}
              unidad=" h"
              invertir
            />
          }
          nota={`${c.weekendHours} h en fin de semana · ${c.absentDays} días de ausencia`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Señales */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {r ? 'Hallazgos' : 'Señales'}
          </p>
          <ul className="mt-3 divide-y divide-gray-100">
            {(r
              ? r.hallazgos.map((h) => ({
                  severity: h.severidad,
                  title: h.titulo,
                  detail: h.detalle,
                  personas: h.personas,
                }))
              : f.signals.map((s) => ({
                  severity: s.severity,
                  title: s.title,
                  detail: s.detail,
                  personas: [] as string[],
                }))
            ).map((h, i) => (
              <li key={i} className="flex gap-3 py-3">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${SEV[h.severity].punto}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{h.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{h.detail}</p>
                  {h.personas.length > 0 && (
                    <p className="mt-1 text-[11px] text-blue-600">{h.personas.join(' · ')}</p>
                  )}
                </div>
                <span
                  className={`ml-auto h-fit shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${SEV[h.severity].chip}`}
                >
                  {SEV[h.severity].label}
                </span>
              </li>
            ))}
            {(r ? r.hallazgos.length : f.signals.length) === 0 && (
              <li className="py-3 text-sm text-gray-500">Sin señales destacables en el periodo.</li>
            )}
          </ul>
          {r && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Tendencias
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{r.tendencias}</p>
            </div>
          )}
        </section>

        {/* Recomendaciones + departamentos */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Decisiones recomendadas
            </p>
            {r ? (
              <ol className="mt-3 space-y-3">
                {r.recomendaciones.map((x, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{x.accion}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{x.por_que}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">
                        Impacto {x.impacto}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                Disponibles cuando la interpretación con IA esté activa.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Por departamento
            </p>
            <table className="mt-3 w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="pb-1 font-semibold">Área</th>
                  <th className="pb-1 text-right font-semibold">Pers.</th>
                  <th className="pb-1 text-right font-semibold">h/día</th>
                  <th className="pb-1 text-right font-semibold">Prod.</th>
                  <th className="pb-1 text-right font-semibold">Δ</th>
                </tr>
              </thead>
              <tbody>
                {f.departments.map((d) => (
                  <tr key={d.name} className="border-t border-gray-100">
                    <td className="py-1.5 text-gray-800">{d.name}</td>
                    <td className="py-1.5 text-right tabular-nums text-gray-500">{d.people}</td>
                    <td className="py-1.5 text-right tabular-nums">{n(d.activeHoursPerDay)}</td>
                    <td className="py-1.5 text-right tabular-nums">{n(d.productivityPct, '%')}</td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        (d.deltaProductivityPp ?? 0) > 0
                          ? 'text-green-600'
                          : (d.deltaProductivityPp ?? 0) < 0
                            ? 'text-red-600'
                            : 'text-gray-400'
                      }`}
                    >
                      {d.deltaProductivityPp === null
                        ? '—'
                        : `${d.deltaProductivityPp > 0 ? '+' : ''}${d.deltaProductivityPp}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>

      {/* Personas */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Personas
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400">
                <th className="pb-2 font-semibold">Persona</th>
                <th className="pb-2 text-right font-semibold">h/día</th>
                <th className="pb-2 text-right font-semibold">Prod.</th>
                <th className="pb-2 text-right font-semibold">Δ pp</th>
                <th className="pb-2 text-center font-semibold">Tend.</th>
                <th className="pb-2 font-semibold">Semanas</th>
                <th className="pb-2 text-right font-semibold">Tarde</th>
                <th className="pb-2 text-right font-semibold">Ausente</th>
                <th className="pb-2 text-right font-semibold">Inactivo</th>
                <th className="pb-2 text-right font-semibold">Fuera hor.</th>
                <th className="pb-2 font-semibold">Lectura</th>
              </tr>
            </thead>
            <tbody>
              {f.persons.map((x) => (
                <FilaPersona key={x.userId} x={x} ia={personasIa.get(x.userId) ?? null} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Informe para gerencia */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Informe para gerencia
          </p>
          <button
            type="button"
            onClick={descargarPdf}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
        <div className="mt-2">
          <MarkdownLite text={informeTexto} />
        </div>
      </section>

      {a.model && <Pregunta id={a.id} />}
    </div>
  )
}

function Indicador({
  titulo,
  valor,
  delta,
  spark,
  fill,
  nota,
}: {
  titulo: string
  valor: string
  delta: React.ReactNode
  spark?: (number | null)[]
  fill?: string
  nota?: string
}) {
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="px-4 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {titulo}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{valor}</p>
        <p className="mt-1 text-[11px]">{delta}</p>
        {nota && <p className="mt-0.5 text-[11px] text-gray-400">{nota}</p>}
      </div>
      {spark && fill ? <Sparkline values={spark} fill={fill} /> : <div className="h-10" />}
    </div>
  )
}

function FilaPersona({ x, ia }: { x: PersonaHechos; ia: Informe['personas'][number] | null }) {
  const c = x.current
  const d =
    c.productivityPct !== null && x.previous.productivityPct !== null
      ? Math.round((c.productivityPct - x.previous.productivityPct) * 10) / 10
      : null
  const peor = x.signals.find((s) => s.severity === 'alta') ?? x.signals[0]
  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="py-2 pr-3">
        <p className="font-medium text-gray-900">{x.name}</p>
        <p className="text-[11px] text-gray-400">{x.department ?? 'Sin departamento'}</p>
        {peor && (
          <span
            className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] ${SEV[peor.severity].chip}`}
          >
            {peor.code.replace(/_/g, ' ')}
          </span>
        )}
      </td>
      <td className="py-2 text-right tabular-nums">{n(c.activeHoursPerDay)}</td>
      <td className="py-2 text-right tabular-nums">{n(c.productivityPct, '%')}</td>
      <td
        className={`py-2 text-right tabular-nums ${
          d === null
            ? 'text-gray-300'
            : d > 0
              ? 'text-green-600'
              : d < 0
                ? 'text-red-600'
                : 'text-gray-400'
        }`}
      >
        {d === null ? '—' : `${d > 0 ? '+' : ''}${d}`}
      </td>
      <td className="py-2 text-center">
        <Tendencia t={x.trend.productivity} />
      </td>
      <td className="py-2">
        <div className="w-24">
          <Sparkline values={x.weekly.map((w) => w.productivityPct)} fill={COLOR.sparkOk} />
        </div>
      </td>
      <td className="py-2 text-right tabular-nums">
        {c.lateDays}/{c.daysActive}
      </td>
      <td className="py-2 text-right tabular-nums">{c.absentDays}</td>
      <td className="py-2 text-right tabular-nums">{n(c.idlePct, '%')}</td>
      <td className="py-2 text-right tabular-nums">{r1(c.offHoursHours + c.weekendHours)} h</td>
      <td className="py-2 pl-3 text-gray-600">
        {ia ? (
          <>
            <p>{ia.diagnostico}</p>
            <p className="mt-0.5 text-blue-700">{ia.recomendacion}</p>
          </>
        ) : (
          <p className="text-gray-400">{peor ? peor.detail : 'Sin novedades.'}</p>
        )}
      </td>
    </tr>
  )
}

function Pregunta({ id }: { id: string }) {
  const [q, setQ] = useState('')
  const [hilo, setHilo] = useState<{ q: string; a: string }[]>([])
  const preguntar = trpc.admin.askAnalyst.useMutation({
    onSuccess: (r, vars) => {
      setHilo((h) => [...h, { q: vars.question, a: r.answer }])
      setQ('')
    },
  })
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Pregúntale al analista
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Sobre este periodo: «¿Quién necesita una conversación esta semana?», «¿Qué área bajó y por
        qué?», «Redacta tres puntos para el comité».
      </p>
      <div className="mt-3 space-y-4">
        {hilo.map((h, i) => (
          <div key={i}>
            <p className="text-sm font-medium text-gray-900">{h.q}</p>
            <div className="mt-1 rounded-xl bg-gray-50 p-4">
              <MarkdownLite text={h.a} />
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (q.trim().length >= 3) preguntar.mutate({ id, question: q.trim() })
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Escribe tu pregunta…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={preguntar.isPending || q.trim().length < 3}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {preguntar.isPending ? 'Pensando…' : 'Preguntar'}
        </button>
      </form>
      {preguntar.error && <p className="mt-2 text-xs text-red-600">{preguntar.error.message}</p>}
    </section>
  )
}

/** Informe de respaldo cuando no hay IA: los hechos, en prosa mínima. */
function informeSinIa(f: Hechos): string {
  const c = f.totals.current
  const p = f.totals.previous
  const fila = (t: string, a: number | null, b: number | null, u = '') =>
    `| ${t} | ${n(a, u)} | ${n(b, u)} |`
  const lineas = [
    `## Informe de comportamiento del equipo — ${f.company}`,
    `Periodo ${f.period.from} a ${f.period.to} (${f.period.weeks} semanas), comparado con ${f.period.previousFrom} a ${f.period.previousTo}. ${f.people} personas.`,
    '',
    '### Indicadores',
    '| Indicador | Periodo | Anterior |',
    '| --- | --- | --- |',
    fila('Horas activas por día', c.activeHoursPerDay, p.activeHoursPerDay, ' h'),
    fila('Productividad', c.productivityPct, p.productivityPct, '%'),
    fila('Efectividad', c.effectivenessPct, p.effectivenessPct, '%'),
    fila('Jornadas con retraso', c.latePct, p.latePct, '%'),
    fila('Días de ausencia', c.absentDays, p.absentDays),
    fila(
      'Horas fuera de horario',
      c.offHoursHours + c.weekendHours,
      p.offHoursHours + p.weekendHours,
      ' h',
    ),
    '',
    '### Señales',
    ...(f.signals.length
      ? f.signals.map((s: Senal) => `- **${s.title}** (${s.severity}): ${s.detail}`)
      : ['- Sin señales destacables.']),
    '',
    '### Por departamento',
    '| Área | Personas | h/día | Productividad | Δ pp |',
    '| --- | --- | --- | --- | --- |',
    ...f.departments.map(
      (d) =>
        `| ${d.name} | ${d.people} | ${n(d.activeHoursPerDay)} | ${n(d.productivityPct, '%')} | ${n(d.deltaProductivityPp)} |`,
    ),
  ]
  return lineas.join('\n')
}
