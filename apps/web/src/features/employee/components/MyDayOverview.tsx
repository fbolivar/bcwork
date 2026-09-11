'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, MonitorOff } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { COLOR, horasCortas } from '@/features/admin/components/panel-identidad'
import {
  Kpi,
  BarraApilada,
  LeyendaClases,
  ColumnaApps,
  type Tramo,
} from '@/features/shared/panel-widgets'

/**
 * "Mi día": la vista del empleado sobre su propia jornada, por día, semana o
 * mes. Misma identidad y mismos widgets que el Resumen del administrador.
 */

type Modo = 'dia' | 'semana' | 'mes'

function hoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mover(iso: string, modo: Modo, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  if (modo === 'dia') d.setUTCDate(d.getUTCDate() + n)
  else if (modo === 'semana') d.setUTCDate(d.getUTCDate() + 7 * n)
  else d.setUTCMonth(d.getUTCMonth() + n, 1)
  return d.toISOString().slice(0, 10)
}

function etiqueta(from: string, to: string, modo: Modo): string {
  const f = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CO', { ...opts, timeZone: 'UTC' })
  if (modo === 'dia')
    return f(from, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  if (modo === 'semana')
    return `${f(from, { day: 'numeric', month: 'short' })} – ${f(to, { day: 'numeric', month: 'short', year: 'numeric' })}`
  return f(from, { month: 'long', year: 'numeric' })
}

// El catálogo guarda la categoría en inglés; se traduce solo para mostrar.
const CATEGORIA_NOMBRE: Record<string, string> = {
  productivity: 'Ofimática',
  development: 'Desarrollo',
  communication: 'Comunicación',
  browsing: 'Navegación',
  email: 'Correo',
  social: 'Redes sociales',
  entertainment: 'Entretenimiento',
  other: 'Otras',
  'Sin categoría': 'Sin categoría',
}
const CATEGORIA_COLOR: Record<string, string> = {
  other: COLOR.inactivo,
  'Sin categoría': COLOR.neutral,
}
const PALETA_CATEGORIAS = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#d97706', '#64748b']
const nombreCategoria = (c: string) => CATEGORIA_NOMBRE[c] ?? c

export function MyDayOverview() {
  const [modo, setModo] = useState<Modo>('dia')
  const [fecha, setFecha] = useState(hoyLocal())
  const hoy = hoyLocal()

  const { data, isLoading } = trpc.employee.getMyDay.useQuery(
    { date: fecha, modo },
    { refetchInterval: fecha === hoy ? 60_000 : false, staleTime: 30_000 },
  )

  const tramos: Tramo[] = data
    ? data.modo === 'dia'
      ? (() => {
          const con = data.hourly.filter((h) => h.productive + h.nonProductive + h.neutral > 0)
          if (!con.length) return []
          const a = Math.max(0, con[0]!.hour - 1)
          const b = Math.min(23, con[con.length - 1]!.hour + 1)
          return data.hourly
            .slice(a, b + 1)
            .map((h) => ({ ...h, etiqueta: `${String(h.hour).padStart(2, '0')}:00` }))
        })()
      : data.daily.map((d) => ({
          ...d,
          etiqueta:
            data.modo === 'semana'
              ? new Date(`${d.date}T12:00:00Z`).toLocaleDateString('es-CO', {
                  weekday: 'short',
                  timeZone: 'UTC',
                })
              : String(Number(d.date.slice(8, 10))),
        }))
    : []

  const k = data?.kpis
  const s = data?.sparklines
  const totalCat = (data?.categories ?? []).reduce((x, c) => x + c.seconds, 0)

  return (
    <div className="space-y-3">
      {/* Encabezado + controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Mi día</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setFecha(mover(fecha, modo, -1))}
              className="p-2 text-gray-500 hover:text-gray-900"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[190px] text-center text-xs font-medium capitalize text-gray-700">
              {data ? etiqueta(data.from, data.to, data.modo) : '…'}
            </span>
            <button
              type="button"
              onClick={() => setFecha(mover(fecha, modo, 1))}
              disabled={fecha >= hoy}
              className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30"
              title="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-1">
            {(
              [
                ['dia', 'Día'],
                ['semana', 'Semana'],
                ['mes', 'Mes'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setModo(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  modo === v
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading || !data || !k || !s ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          {!data.hasData && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-8 text-center">
              <MonitorOff className="h-8 w-8 text-gray-300" strokeWidth={1.2} />
              <p className="text-sm font-medium text-gray-700">
                {data.includesToday
                  ? 'Hoy no se ha registrado ningún dato'
                  : 'No hay datos en este período'}
              </p>
              <p className="max-w-md text-xs text-gray-400">
                {data.includesToday
                  ? 'Tu actividad aparece aquí cuando el agente instalado en tu equipo está en marcha y tú estás trabajando.'
                  : 'Ni el agente ni el registro manual reportaron actividad en estas fechas.'}
              </p>
            </div>
          )}

          {/* KPIs: dos filas de cuatro */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              titulo="Hora de llegada"
              valor={k.arrival ?? '–'}
              tono={k.arrival ? 'ok' : 'neutro'}
              spark={s.arrival}
              ayuda="Primera actividad registrada. En semana y mes, el promedio de los días trabajados."
              nota={data.modo !== 'dia' ? 'promedio' : undefined}
            />
            <Kpi
              titulo="Hora de salida"
              valor={k.inProgress ? 'en curso' : (k.departure ?? '–')}
              tono={k.departure || k.inProgress ? 'ok' : 'neutro'}
              spark={s.departure}
              ayuda="Última actividad registrada. Mientras estás activo, dice 'en curso'."
              nota={data.modo !== 'dia' ? 'promedio' : undefined}
            />
            <Kpi
              titulo="Tiempo productivo"
              valor={k.productiveSecs > 0 ? horasCortas(k.productiveSecs) : '–'}
              tono={k.productiveSecs > 0 ? 'ok' : 'neutro'}
              spark={s.productive}
              ayuda="Tiempo en aplicaciones clasificadas como productivas."
            />
            <Kpi
              titulo="Tiempo en BCWork"
              valor={k.trackedSecs > 0 ? horasCortas(k.trackedSecs) : '–'}
              tono={k.trackedSecs > 0 ? 'ok' : 'neutro'}
              spark={s.tracked}
              ayuda="Todo el tiempo con actividad registrada por el agente."
            />
            <Kpi
              titulo="Tiempo en el trabajo"
              valor={k.atWorkSecs ? horasCortas(k.atWorkSecs) : '–'}
              tono={k.atWorkSecs ? 'ok' : 'neutro'}
              spark={s.tracked}
              ayuda="De la primera a la última actividad del día, pausas incluidas. Solo en vista por día."
            />
            <Kpi
              titulo="Tiempo en proyectos"
              valor={k.projectSecs > 0 ? horasCortas(k.projectSecs) : '–'}
              tono={k.projectSecs > 0 ? 'ok' : 'neutro'}
              spark={s.projects}
              ayuda="Horas registradas en proyectos y tareas."
            />
            <Kpi
              titulo="Eficacia"
              valor={k.efficacyPct === null ? '–' : `${k.efficacyPct}%`}
              tono={k.efficacyPct !== null && k.efficacyPct >= 50 ? 'ok' : 'neutro'}
              spark={s.efficacy}
              ayuda="Productivo sobre productivo más improductivo; el tiempo neutral no cuenta."
            />
            <Kpi
              titulo="Productividad"
              valor={k.productivityPct === null ? '–' : `${k.productivityPct}%`}
              tono={k.productivityPct !== null && k.productivityPct >= 50 ? 'ok' : 'neutro'}
              spark={s.productivity}
              ayuda="Productivo sobre todo el tiempo con actividad."
            />
          </div>

          {/* Barra de productividad */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Barra de productividad</h3>
              <LeyendaClases />
            </div>
            <BarraApilada
              tramos={tramos}
              cadaN={data.modo === 'mes' ? 5 : data.modo === 'semana' ? 1 : 3}
            />
          </div>

          {/* Aplicaciones por clase, una tarjeta ancha por clase */}
          <ColumnaApps
            titulo="Aplicaciones productivas"
            color={COLOR.productivo}
            columnas={4}
            {...data.apps.productive}
          />
          <ColumnaApps
            titulo="Aplicaciones improductivas"
            color={COLOR.improductivo}
            columnas={4}
            {...data.apps.nonProductive}
          />
          <ColumnaApps
            titulo="Aplicaciones neutrales"
            color={COLOR.inactivo}
            columnas={4}
            {...data.apps.neutral}
          />

          {/* Categorías */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-700">Categorías</h3>
            {totalCat === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">Sin datos de categorías.</p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-4">
                  {data.categories.map((c, i) => (
                    <span key={c.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <i
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          background:
                            CATEGORIA_COLOR[c.name] ??
                            PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length],
                        }}
                      />
                      {nombreCategoria(c.name)}
                      <span className="text-gray-400">{horasCortas(c.seconds)}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex h-10 overflow-hidden rounded-lg bg-gray-100">
                  {data.categories.map((c, i) => (
                    <div
                      key={c.name}
                      style={{
                        width: `${(c.seconds / totalCat) * 100}%`,
                        background:
                          CATEGORIA_COLOR[c.name] ??
                          PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length],
                      }}
                      title={`${nombreCategoria(c.name)}: ${horasCortas(c.seconds)}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
