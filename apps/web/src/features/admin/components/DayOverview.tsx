'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { DayRankings, DayApps } from './DayOverviewLists'
import { Kpi, BarraApilada, LeyendaClases, type Tramo } from '@/features/shared/panel-widgets'

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

export function DayOverview() {
  const [fecha, setFecha] = useState(hoyLocal())
  const [depto, setDepto] = useState('')
  const hoy = hoyLocal()

  const { data, isLoading } = trpc.admin.getDayOverview.useQuery(
    { date: fecha, ...(depto ? { department: depto } : {}) },
    { refetchInterval: fecha === hoy ? 60_000 : false, staleTime: 30_000 },
  )

  // Solo el tramo con actividad, con una hora de margen a cada lado.
  const tramos: Tramo[] = (() => {
    const filas = data?.hourly ?? []
    const con = filas.filter((h) => h.productive + h.nonProductive + h.neutral > 0)
    if (!con.length) return []
    const a = Math.max(0, con[0]!.hour - 1)
    const b = Math.min(23, con[con.length - 1]!.hour + 1)
    return filas
      .slice(a, b + 1)
      .map((h) => ({ ...h, etiqueta: `${String(h.hour).padStart(2, '0')}:00` }))
  })()

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
                <LeyendaClases />
              </div>
              <BarraApilada tramos={tramos} />
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
