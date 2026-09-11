'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { COLOR, horasCortas } from './panel-identidad'
import { DayRankings, DayApps } from './DayOverviewLists'

/**
 * Panel del día: la primera pantalla del administrador.
 *
 * Responde, para una fecha y un equipo, lo que un supervisor pregunta al
 * llegar: quién llegó, quién no, quién llegó tarde, en qué se está yendo el
 * tiempo y quién está haciendo qué ahora mismo.
 */

function hoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sumarDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function etiquetaFecha(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Área suavizada de 7 puntos, sin ejes: solo dice si la semana sube o baja. */
function Sparkline({ values, fill }: { values: (number | null)[]; fill: string }) {
  if (values.length < 2) return <div className="h-10" />
  const nums = values.map((v) => v ?? 0)
  const max = Math.max(...nums, 1)
  const W = 100
  const H = 36
  const paso = nums.length > 1 ? W / (nums.length - 1) : W
  const pts = nums.map((v, i) => [i * paso, H - (v / max) * (H - 4) - 2] as const)
  const linea = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-10 w-full">
      <path d={`${linea} L${W},${H} L0,${H} Z`} fill={fill} />
    </svg>
  )
}

function Kpi({
  titulo,
  valor,
  tono,
  spark,
  ayuda,
}: {
  titulo: string
  valor: string
  tono: 'ok' | 'mal' | 'neutro'
  spark: (number | null)[]
  ayuda: string
}) {
  const color = tono === 'ok' ? 'text-green-600' : tono === 'mal' ? 'text-red-600' : 'text-gray-400'
  const relleno =
    tono === 'ok' ? COLOR.sparkOk : tono === 'mal' ? COLOR.sparkMal : COLOR.sparkNeutro
  return (
    <div
      className="flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white"
      title={ayuda}
    >
      <div className="px-4 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {titulo}
        </p>
        <p className={`mt-1 text-3xl font-bold tabular-nums ${color}`}>{valor}</p>
      </div>
      <Sparkline values={spark} fill={relleno} />
    </div>
  )
}

function BarraHoraria({
  filas,
}: {
  filas: { hour: number; productive: number; nonProductive: number; neutral: number }[]
}) {
  // Solo el tramo con actividad, con una hora de margen a cada lado.
  const conDatos = filas.filter((f) => f.productive + f.nonProductive + f.neutral > 0)
  if (conDatos.length === 0) {
    return (
      <p className="py-14 text-center text-xs text-gray-400">Sin actividad registrada ese día.</p>
    )
  }
  const desde = Math.max(0, conDatos[0]!.hour - 1)
  const hasta = Math.min(23, conDatos[conDatos.length - 1]!.hour + 1)
  const tramo = filas.slice(desde, hasta + 1)
  const max = Math.max(...tramo.map((f) => f.productive + f.nonProductive + f.neutral), 1)

  return (
    <div className="flex min-h-[224px] flex-1 items-stretch gap-1 px-1">
      {tramo.map((f) => {
        const total = f.productive + f.nonProductive + f.neutral
        const alto = (total / max) * 100
        const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)
        return (
          <div key={f.hour} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div
              className="flex w-full flex-col-reverse overflow-hidden rounded-sm"
              style={{ height: `${Math.max(alto, total > 0 ? 3 : 0)}%` }}
              title={`${String(f.hour).padStart(2, '0')}:00 · productivo ${horasCortas(f.productive)} · improductivo ${horasCortas(f.nonProductive)} · neutral ${horasCortas(f.neutral)}`}
            >
              <div style={{ height: `${pct(f.productive)}%`, background: COLOR.productivo }} />
              <div style={{ height: `${pct(f.neutral)}%`, background: COLOR.neutral }} />
              <div style={{ height: `${pct(f.nonProductive)}%`, background: COLOR.improductivo }} />
            </div>
            {total === 0 && <div className="h-px w-full bg-gray-200" />}
            <span className="text-[10px] tabular-nums text-gray-400">
              {f.hour % 3 === 0 ? `${String(f.hour).padStart(2, '0')}:00` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function DayOverview() {
  const [fecha, setFecha] = useState(hoyLocal())
  const [depto, setDepto] = useState('')
  const hoy = hoyLocal()

  const { data, isLoading } = trpc.admin.getDayOverview.useQuery(
    { date: fecha, ...(depto ? { department: depto } : {}) },
    { refetchInterval: fecha === hoy ? 60_000 : false, staleTime: 30_000 },
  )

  const tabs = [
    { v: '', l: 'Toda la empresa' },
    ...(data?.hasNoDepartment ? [{ v: '__none__', l: 'Sin departamento' }] : []),
    ...(data?.departments ?? []).map((d) => ({ v: d, l: d })),
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-gray-700">El día</h2>
        <span className="text-[11px] text-gray-400">
          {data ? `${data.people} persona${data.people === 1 ? '' : 's'}` : ''}
          {fecha === hoy ? ' · actualiza cada minuto' : ''}
        </span>
      </div>

      {/* Controles: equipo y fecha */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setDepto(t.v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                depto === t.v
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
        <div className="flex items-center rounded-lg border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setFecha(sumarDias(fecha, -1))}
            className="p-2 text-gray-500 hover:text-gray-900"
            title="Día anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[190px] text-center text-xs font-medium capitalize text-gray-700">
            {etiquetaFecha(fecha)}
          </span>
          <button
            type="button"
            onClick={() => setFecha(sumarDias(fecha, 1))}
            disabled={fecha >= hoy}
            className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30"
            title="Día siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl bg-gray-100" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Barra horaria + KPIs */}
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Barra de productividad</h3>
                <div className="flex gap-3 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <i
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: COLOR.productivo }}
                    />
                    Productivo
                  </span>
                  <span className="flex items-center gap-1">
                    <i
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: COLOR.neutral }}
                    />
                    Neutral
                  </span>
                  <span className="flex items-center gap-1">
                    <i
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: COLOR.improductivo }}
                    />
                    Improductivo
                  </span>
                </div>
              </div>
              <BarraHoraria filas={data.hourly} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Kpi
                titulo="Productividad"
                valor={data.kpis.productivityPct === null ? '–' : `${data.kpis.productivityPct}%`}
                tono={data.kpis.productivityPct === null ? 'neutro' : 'ok'}
                spark={data.sparklines.productivityPct}
                ayuda="Tiempo productivo sobre el total con actividad, del equipo seleccionado"
              />
              <Kpi
                titulo="Tarde"
                valor={data.kpis.late === 0 ? '–' : String(data.kpis.late)}
                tono={data.kpis.late === 0 ? 'neutro' : 'mal'}
                spark={data.sparklines.late}
                ayuda="Personas cuya primera actividad fue después de la hora de entrada más la tolerancia"
              />
              <Kpi
                titulo="Ausente"
                valor={data.kpis.absent === 0 ? '–' : String(data.kpis.absent)}
                tono={data.kpis.absent === 0 ? 'neutro' : 'mal'}
                spark={data.sparklines.absent}
                ayuda="Personas con horario para hoy y sin ninguna actividad"
              />
              <Kpi
                titulo="Llegó"
                valor={data.kpis.arrived === 0 ? '–' : String(data.kpis.arrived)}
                tono={data.kpis.arrived === 0 ? 'neutro' : 'ok'}
                spark={data.sparklines.arrived}
                ayuda="Personas con al menos un evento de actividad en el día"
              />
              {/* "Ahora" solo existe para hoy; en días pasados queda en guion. */}
              <Kpi
                titulo="Productivos ahora"
                valor={
                  !data.isToday || data.kpis.productiveNow === 0
                    ? '–'
                    : String(data.kpis.productiveNow)
                }
                tono={!data.isToday || data.kpis.productiveNow === 0 ? 'neutro' : 'ok'}
                spark={[]}
                ayuda="Última actividad en los últimos 15 minutos fue en una aplicación productiva"
              />
              <Kpi
                titulo="Distraídos ahora"
                valor={
                  !data.isToday || data.kpis.slackingNow === 0 ? '–' : String(data.kpis.slackingNow)
                }
                tono={!data.isToday || data.kpis.slackingNow === 0 ? 'neutro' : 'mal'}
                spark={[]}
                ayuda="Última actividad en los últimos 15 minutos fue en una aplicación improductiva"
              />
            </div>
          </div>

          <DayRankings r={data.rankings} />
          <DayApps a={data.apps} />
        </>
      )}
    </div>
  )
}
