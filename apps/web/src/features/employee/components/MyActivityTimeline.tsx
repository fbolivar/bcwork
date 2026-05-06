'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { ChevronLeft, ChevronRight, Activity, Monitor } from 'lucide-react'

const PROD_COLORS = {
  productive: { bar: 'bg-green-500', badge: 'bg-green-100 text-green-700', label: 'Productivo' },
  unproductive: { bar: 'bg-red-400', badge: 'bg-red-100 text-red-600', label: 'No productivo' },
  neutral: { bar: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500', label: 'Neutral' },
  idle: { bar: 'bg-yellow-300', badge: 'bg-yellow-100 text-yellow-600', label: 'Inactivo' },
} as const

type Productivity = keyof typeof PROD_COLORS

function today() {
  return new Date().toISOString().slice(0, 10)
}

function offsetDate(base: string, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function fmtDur(secs: number) {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

function fmtSecs(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function appShortName(identifier: string | null) {
  if (!identifier) return 'Desconocido'
  const parts = identifier.split(/[./\\]/)
  return parts[parts.length - 1] ?? identifier
}

type Event = {
  id: string
  started_at: string
  duration_seconds: number
  app_identifier: string | null
  window_title: string | null
  productivity: Productivity
  event_type: string
}

function groupByHour(events: Event[]) {
  const map = new Map<number, Event[]>()
  for (const e of events) {
    const h = new Date(e.started_at).getHours()
    if (!map.has(h)) map.set(h, [])
    map.get(h)!.push(e)
  }
  // Fill all hours that have activity
  const hours = Array.from(map.keys()).sort((a, b) => a - b)
  return hours.map((h) => ({ hour: h, events: map.get(h)! }))
}

function HourBlock({ hour, events }: { hour: number; events: Event[] }) {
  const [expanded, setExpanded] = useState(false)
  const totalSecs = events.reduce((s, e) => s + e.duration_seconds, 0)

  // Max bar width based on 3600s
  const barWidth = Math.min(100, Math.round((totalSecs / 3600) * 100))

  // Productivity breakdown
  const breakdown = Object.keys(PROD_COLORS)
    .map((k) => {
      const p = k as Productivity
      const secs = events
        .filter((e) => e.productivity === p)
        .reduce((s, e) => s + e.duration_seconds, 0)
      return { p, secs, pct: totalSecs > 0 ? Math.round((secs / totalSecs) * 100) : 0 }
    })
    .filter((b) => b.secs > 0)

  const label = `${String(hour).padStart(2, '0')}:00`

  return (
    <div className="group">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50"
      >
        {/* Hora */}
        <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-gray-400">{label}</span>

        {/* Barra de actividad */}
        <div className="flex flex-1 flex-col gap-1.5">
          <div
            className="flex h-5 overflow-hidden rounded-full bg-gray-100"
            style={{ width: '100%' }}
          >
            {breakdown.map(({ p, pct }) => (
              <div
                key={p}
                className={`${PROD_COLORS[p].bar} transition-all`}
                style={{ width: `${pct}%` }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{fmtDur(totalSecs)}</span>
            <span>·</span>
            <span>
              {events.length} evento{events.length > 1 ? 's' : ''}
            </span>
            {breakdown.map(
              ({ p, pct }) =>
                pct > 10 && (
                  <span
                    key={p}
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PROD_COLORS[p].badge}`}
                  >
                    {pct}% {PROD_COLORS[p].label.toLowerCase()}
                  </span>
                ),
            )}
          </div>
        </div>

        <span className="shrink-0 text-xs text-gray-300 group-hover:text-gray-400">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="ml-15 mb-2 ml-[60px] space-y-1 pr-3">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2"
            >
              <div
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PROD_COLORS[e.productivity as Productivity]?.bar ?? 'bg-gray-300'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                  <Monitor className="h-3 w-3 shrink-0 text-gray-400" />
                  <span className="truncate">{appShortName(e.app_identifier)}</span>
                </p>
                {e.window_title && (
                  <p className="mt-0.5 truncate text-[11px] text-gray-400">{e.window_title}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-medium text-gray-600">{fmtDur(e.duration_seconds)}</p>
                <p className="text-[10px] text-gray-400">{fmtTime(e.started_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MyActivityTimeline() {
  const [date, setDate] = useState(today())

  const { data, isLoading } = trpc.employee.getMyActivityTimeline.useQuery(
    { date },
    { refetchOnWindowFocus: false },
  )

  const hourBlocks = data ? groupByHour(data.events) : []
  const summary = data?.summary

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mi actividad detallada</h1>
        <p className="mt-1 text-sm text-gray-500">
          Registro app a app de tu actividad laboral. Cada evento muestra la aplicación, ventana
          activa y duración.
        </p>
      </div>

      {/* Navegación por fecha */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setDate((d) => offsetDate(d, -1))}
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setDate((d) => offsetDate(d, 1))}
          disabled={date >= today()}
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
        <span className="text-sm capitalize text-gray-500">{fmtDate(date)}</span>
      </div>

      {/* Resumen del día */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Tiempo activo',
              value: fmtSecs(summary.active_seconds),
              color: 'text-blue-700 bg-blue-50 border-blue-200',
            },
            {
              label: 'Productivo',
              value: fmtSecs(summary.productive_seconds),
              color: 'text-green-700 bg-green-50 border-green-200',
            },
            {
              label: 'No productivo',
              value: fmtSecs(summary.non_productive_seconds),
              color: 'text-red-600 bg-red-50 border-red-200',
            },
            {
              label: 'Productividad',
              value: `${Math.round(summary.productivity_ratio * 100)}%`,
              color:
                summary.productivity_ratio >= 0.6
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : summary.productivity_ratio >= 0.4
                    ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
                    : 'text-red-600 bg-red-50 border-red-200',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border p-3 ${color}`}>
              <p className="text-xs opacity-70">{label}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center text-gray-400">Cargando...</div>
      )}

      {!isLoading && hourBlocks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <Activity className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Sin actividad registrada este día</p>
          <p className="mt-1 text-xs text-gray-400">
            El agente debe estar activo para registrar la actividad
          </p>
        </div>
      )}

      {/* Leyenda */}
      {hourBlocks.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(PROD_COLORS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-full ${v.bar}`} />
              <span className="text-xs text-gray-500">{v.label}</span>
            </div>
          ))}
          <span className="text-xs text-gray-400">· Haz clic en cada hora para ver el detalle</span>
        </div>
      )}

      {/* Timeline por hora */}
      {hourBlocks.length > 0 && (
        <div className="divide-y divide-gray-50 rounded-xl border border-gray-200 bg-white">
          {hourBlocks.map(({ hour, events }) => (
            <HourBlock key={hour} hour={hour} events={events} />
          ))}
        </div>
      )}

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
        <strong>Datos registrados por el agente.</strong> Si hay errores en la clasificación de
        productividad, puedes solicitar una corrección desde{' '}
        <a href="/me/sessions" className="underline">
          Mis sesiones
        </a>
        .
      </div>
    </div>
  )
}
