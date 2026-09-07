'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { MapPin, Building2 } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

/**
 * Tendencia, reparto del tiempo, top de aplicaciones y presencial/remoto.
 *
 * El Resumen no tenía una sola línea de tiempo: solo números sueltos. Y tres
 * dimensiones que ya se calculaban a diario —apps_top, location_type y el
 * reparto productivo/no productivo— no aparecían en ninguna pantalla.
 */

// Paleta estable: el mismo significado conserva el mismo color en todo el panel.
const C = {
  cumplimiento: '#0891b2',
  productividad: '#7c3aed',
  productivo: '#0891b2',
  noProductivo: '#f97316',
  neutral: '#cbd5e1',
  inactivo: '#94a3b8',
}

function horas(secs: number) {
  return secs >= 3600 ? `${(secs / 3600).toFixed(1)} h` : `${Math.round(secs / 60)} m`
}

function etiquetaSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`)
  return `${d.getUTCDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getUTCMonth()]}`
}

function Caja({
  titulo,
  sub,
  children,
}: {
  titulo: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700">{titulo}</h3>
      {sub && <p className="mb-2 mt-0.5 text-[11px] text-gray-400">{sub}</p>}
      {children}
    </div>
  )
}

export function CompanyInsights() {
  const { data, isLoading } = trpc.admin.getCompanyInsights.useQuery(
    { weeks: 4 },
    { staleTime: 5 * 60_000 },
  )

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
  if (!data?.hasData) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
        Todavía no hay métricas para graficar. Se calculan cada hora a partir de la actividad de los
        agentes.
      </div>
    )
  }

  const serie = data.trend.map((w) => ({
    semana: etiquetaSemana(w.weekStart),
    Cumplimiento: w.complianceRatio === null ? null : Math.round(w.complianceRatio * 100),
    Productividad: w.productivityRatio === null ? null : Math.round(w.productivityRatio * 100),
  }))

  const d = data.distribution
  // El reparto se calcula sobre el tiempo CON actividad. La inactividad va aparte
  // porque incluye noches y fines de semana con el equipo encendido: mezclarla
  // aplasta el grafico (en GVM son 155 h contra 21 de trabajo real) y no dice
  // nada sobre la jornada.
  const totalReparto = d.productive + d.nonProductive + d.neutral
  const partes = [
    { k: 'Productivo', v: d.productive, c: C.productivo },
    { k: 'No productivo', v: d.nonProductive, c: C.noProductivo },
    { k: 'Neutral / sin clasificar', v: d.neutral, c: C.neutral },
  ].filter((p) => p.v > 0)

  const maxApp = data.topApps[0]?.seconds ?? 1
  const totalDias = data.locations.reduce((s, l) => s + l.days, 0)

  return (
    <div className="space-y-3">
      {/* Tendencia: lo primero que muestra cualquier herramienta de la categoría
          y lo único que permite decir si la semana fue mejor o peor. */}
      <Caja
        titulo="Tendencia de las últimas 4 semanas"
        sub="% sobre la jornada pactada y sobre el tiempo con actividad"
      >
        {serie.length < 2 ? (
          <p className="py-8 text-center text-xs text-gray-400">
            Hace falta más de una semana de datos para dibujar una tendencia. Llevás{' '}
            {serie.length === 1 ? 'una semana' : 'ninguna'}.
          </p>
        ) : (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  domain={[0, 'dataMax']}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(v) => `${v}%`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="Cumplimiento"
                  stroke={C.cumplimiento}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="Productividad"
                  stroke={C.productividad}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Caja>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Reparto del tiempo: responde "¿en qué se va el día?" */}
        <Caja
          titulo="En qué se va el tiempo activo"
          sub={`${horas(totalReparto)} con interacción en el período`}
        >
          {totalReparto === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400">Sin tiempo registrado.</p>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
                {partes.map((p) => (
                  <div
                    key={p.k}
                    style={{ width: `${(p.v / totalReparto) * 100}%`, background: p.c }}
                    title={`${p.k}: ${horas(p.v)}`}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {partes.map((p) => (
                  <li key={p.k} className="flex items-center gap-2 text-xs">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ background: p.c }}
                    />
                    <span className="flex-1 text-gray-700">{p.k}</span>
                    <span className="font-medium text-gray-900">{horas(p.v)}</span>
                    <span className="w-10 text-right text-gray-400">
                      {Math.round((p.v / totalReparto) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
              {d.neutral > d.productive && (
                <p className="mt-2 text-[11px] text-amber-600">
                  La mayor parte está sin clasificar: revisá el catálogo de aplicaciones para que
                  estas cifras signifiquen algo.
                </p>
              )}
              {d.idle > 0 && (
                <p className="mt-2 border-t border-gray-100 pt-2 text-[11px] text-gray-400">
                  Aparte: {horas(d.idle)} de equipo encendido sin interacción. Incluye noches y
                  fines de semana si el equipo queda prendido, así que no es tiempo de jornada.
                </p>
              )}
            </>
          )}
        </Caja>

        {/* Top de apps: ya estaba calculado en apps_top y no se mostraba. */}
        <Caja titulo="Aplicaciones más usadas" sub="suma de toda la empresa en el período">
          <ul className="space-y-1.5">
            {data.topApps.map((a) => (
              <li key={a.name} className="flex items-center gap-2">
                <span className="w-32 shrink-0 truncate text-xs text-gray-700" title={a.name}>
                  {a.name}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <span
                    className="block h-2 rounded-full bg-cyan-500"
                    style={{ width: `${Math.max((a.seconds / maxApp) * 100, 2)}%` }}
                  />
                </span>
                <span className="w-14 text-right text-[11px] text-gray-500">
                  {horas(a.seconds)}
                </span>
              </li>
            ))}
          </ul>
        </Caja>
      </div>

      {/* Presencial vs remoto: poblado al 100% y sin mostrar, en un producto de
          teletrabajo. */}
      {totalDias > 0 && (
        <Caja titulo="Dónde se trabaja" sub="días-persona registrados en el período">
          <div className="flex flex-wrap gap-4">
            {data.locations.map((l) => {
              const remoto = l.type === 'remote'
              const nombre =
                l.type === 'remote'
                  ? 'Remoto'
                  : l.type === 'office'
                    ? 'Oficina'
                    : l.type === 'sin_dato'
                      ? 'Sin dato'
                      : l.type
              return (
                <div key={l.type} className="flex items-center gap-2">
                  {remoto ? (
                    <MapPin className="h-4 w-4 text-cyan-600" />
                  ) : (
                    <Building2 className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700">{nombre}</span>
                  <span className="text-sm font-bold text-gray-900">
                    {Math.round((l.days / totalDias) * 100)}%
                  </span>
                  <span className="text-[11px] text-gray-400">({l.days} días)</span>
                </div>
              )
            })}
          </div>
        </Caja>
      )}
    </div>
  )
}
