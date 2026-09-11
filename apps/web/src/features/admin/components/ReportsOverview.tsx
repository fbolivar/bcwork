'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronDown, Check, UsersRound } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { trpc } from '@/lib/trpc-client'
import { COLOR, horasCortas, iniciales } from './panel-identidad'
import { ColumnaApps } from '@/features/shared/panel-widgets'
import type { PersonaInforme } from '@/server/reports-overview'

/**
 * Informes > Resumen: el período de un equipo de un vistazo. Filtros por
 * equipo y miembro, seis KPIs, perfil de productividad por hora, rankings y
 * aplicaciones por clase.
 */

type Modo = 'dia' | 'semana' | 'mes'

function hoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function masDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function rango(ancla: string, modo: Modo): { from: string; to: string } {
  if (modo === 'dia') return { from: ancla, to: ancla }
  if (modo === 'semana') {
    const d = new Date(`${ancla}T12:00:00Z`)
    const dow = d.getUTCDay()
    const lunes = masDias(ancla, dow === 0 ? -6 : 1 - dow)
    return { from: lunes, to: masDias(lunes, 6) }
  }
  const primero = `${ancla.slice(0, 7)}-01`
  const d = new Date(`${primero}T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + 1, 0)
  return { from: primero, to: d.toISOString().slice(0, 10) }
}
function mover(ancla: string, modo: Modo, n: number) {
  const d = new Date(`${ancla}T12:00:00Z`)
  if (modo === 'dia') d.setUTCDate(d.getUTCDate() + n)
  else if (modo === 'semana') d.setUTCDate(d.getUTCDate() + 7 * n)
  else d.setUTCMonth(d.getUTCMonth() + n, 1)
  return d.toISOString().slice(0, 10)
}
function etiqueta(from: string, to: string) {
  const f = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  return from === to ? f(from) : `${f(from)} – ${f(to)}`
}

function Kpi({
  titulo,
  valor,
  tono = 'ok',
}: {
  titulo: string
  valor: string
  tono?: 'ok' | 'mal' | 'neutro'
}) {
  const color = tono === 'ok' ? 'text-green-600' : tono === 'mal' ? 'text-red-600' : 'text-gray-400'
  const barra = tono === 'ok' ? 'bg-green-500' : tono === 'mal' ? 'bg-red-500' : 'bg-gray-300'
  return (
    <div className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5">
      <div className={`w-1 shrink-0 rounded-full ${barra}`} />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {titulo}
        </p>
        <p className={`mt-1 text-3xl font-bold tabular-nums ${color}`}>{valor}</p>
      </div>
    </div>
  )
}

function Filtro({
  etiqueta: lbl,
  opciones,
  valor,
  onChange,
}: {
  etiqueta: string
  opciones: { id: string; name: string; sub?: string }[]
  valor: string[]
  onChange: (v: string[]) => void
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        {lbl}
        <span className="rounded bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
          {valor.length || opciones.length}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>
      {abierto && (
        <div className="absolute left-0 top-11 z-20 max-h-64 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full rounded-md px-2 py-1.5 text-left text-xs text-blue-600 hover:bg-blue-50"
          >
            Todos
          </button>
          {opciones.map((o) => {
            const on = valor.includes(o.id)
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange(on ? valor.filter((x) => x !== o.id) : [...valor, o.id])}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${on ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1 truncate">{o.name}</span>
                {o.sub && <span className="text-[11px] text-gray-400">{o.sub}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Ranking({
  titulo,
  personas,
  total,
  detalle,
  vacio,
}: {
  titulo: string
  personas: PersonaInforme[]
  total: number
  detalle: (p: PersonaInforme) => string
  vacio: string
}) {
  const [todo, setTodo] = useState(false)
  return (
    <div className="flex min-h-[260px] flex-col rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{titulo}</p>
      {personas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
          <UsersRound className="h-9 w-9" strokeWidth={1.2} />
          <p className="text-sm">{vacio}</p>
        </div>
      ) : (
        <ul className="mt-4 flex-1 space-y-3">
          {personas.map((p) => (
            <li key={p.userId} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                {iniciales(p.name)}
              </span>
              <div className="min-w-0">
                <Link
                  href={`/admin/users?u=${p.userId}`}
                  className="block truncate text-sm font-medium text-gray-800 hover:text-blue-700"
                >
                  {p.name}
                </Link>
                <p className="text-xs text-gray-500">{detalle(p)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 border-t border-gray-100 pt-3">
        {total > 5 ? (
          <button
            type="button"
            onClick={() => setTodo((v) => !v)}
            className="text-sm text-blue-600 hover:underline"
          >
            Ver todo ({total})
          </button>
        ) : (
          <span className="text-sm text-gray-300">Ver todo</span>
        )}
      </div>
      {todo && (
        <p className="mt-2 text-[11px] text-gray-400">
          El detalle completo está en Comparar por miembros.
        </p>
      )}
    </div>
  )
}

function hms(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.round(secs % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ReportsOverview() {
  const [modo, setModo] = useState<Modo>('semana')
  const [ancla, setAncla] = useState(hoyLocal())
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [userIds, setUserIds] = useState<string[]>([])
  const [aplicado, setAplicado] = useState<{ team_ids: string[]; user_ids: string[] }>({
    team_ids: [],
    user_ids: [],
  })
  const { from, to } = rango(ancla, modo)

  const { data, isLoading } = trpc.admin.getReportsOverview.useQuery(
    {
      from,
      to,
      ...(aplicado.team_ids.length ? { team_ids: aplicado.team_ids } : {}),
      ...(aplicado.user_ids.length ? { user_ids: aplicado.user_ids } : {}),
    },
    { staleTime: 60_000 },
  )

  const k = data?.kpis
  const r = data?.rankings

  return (
    <div className="space-y-4">
      {/* Período y modo */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center rounded-lg border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setAncla(mover(ancla, modo, -1))}
            className="p-2 text-gray-500 hover:text-gray-900"
            title="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[280px] text-center text-xs font-medium capitalize text-gray-700">
            {etiqueta(from, to)}
          </span>
          <button
            type="button"
            onClick={() => setAncla(mover(ancla, modo, 1))}
            disabled={from > hoyLocal()}
            className="p-2 text-gray-500 hover:text-gray-900 disabled:opacity-30"
            title="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
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
              className={`rounded-md px-3 py-1.5 text-sm transition ${modo === v ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <Filtro
          etiqueta="Equipos"
          opciones={(data?.filters.teams ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            sub: `${t.members}`,
          }))}
          valor={teamIds}
          onChange={setTeamIds}
        />
        <Filtro
          etiqueta="Miembros"
          opciones={data?.filters.members ?? []}
          valor={userIds}
          onChange={setUserIds}
        />
        <button
          type="button"
          onClick={() => setAplicado({ team_ids: teamIds, user_ids: userIds })}
          className="ml-auto text-sm font-semibold uppercase tracking-wide text-blue-600 hover:underline"
        >
          Aplicar filtro
        </button>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : !data.hasData || !k || !r ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-400">
          Sin actividad registrada en este período para {data.people} persona
          {data.people === 1 ? '' : 's'}.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi titulo="Tiempo de BCWork" valor={horasCortas(k.trackedSecs)} />
            <Kpi titulo="Tiempo en el trabajo" valor={horasCortas(k.atWorkSecs)} />
            <Kpi titulo="Tiempo sin conexión" valor={horasCortas(k.idleSecs)} tono="mal" />
            <Kpi
              titulo="Duración de los proyectos"
              valor={k.projectSecs > 0 ? horasCortas(k.projectSecs) : '–'}
              tono={k.projectSecs > 0 ? 'ok' : 'neutro'}
            />
            <Kpi
              titulo="Eficacia"
              valor={k.effectivenessPct === null ? '–' : `${k.effectivenessPct}%`}
              tono={k.effectivenessPct === null ? 'neutro' : 'ok'}
            />
            <Kpi
              titulo="Productividad"
              valor={k.productivityPct === null ? '–' : `${k.productivityPct}%`}
              tono={k.productivityPct === null ? 'neutro' : 'ok'}
            />
          </div>

          {/* Perfil de productividad por hora */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Barra de productividad
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              % del tiempo disponible del equipo en cada media hora, sumando todo el período
            </p>
            <div className="mt-3 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.profile} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={5} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(v, n) => [
                      `${v}%`,
                      n === 'productive'
                        ? 'productivo'
                        : n === 'neutral'
                          ? 'neutral'
                          : 'improductivo',
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="productive"
                    stackId="1"
                    stroke={COLOR.productivo}
                    fill={COLOR.productivo}
                    fillOpacity={0.85}
                  />
                  <Area
                    type="monotone"
                    dataKey="neutral"
                    stackId="1"
                    stroke={COLOR.neutral}
                    fill={COLOR.neutral}
                    fillOpacity={0.9}
                  />
                  <Area
                    type="monotone"
                    dataKey="nonProductive"
                    stackId="1"
                    stroke={COLOR.improductivo}
                    fill={COLOR.improductivo}
                    fillOpacity={0.85}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rankings, fila 1 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Ranking
              titulo="Más productivo"
              personas={r.mostProductive}
              total={r.counts.productive}
              detalle={(p) =>
                `${p.productivityPct ?? 0}%, ${horasCortas(p.productiveSecs)} de ${horasCortas(p.trackedSecs)}`
              }
              vacio="Sin actividad"
            />
            <Ranking
              titulo="Más improductivo"
              personas={r.mostUnproductive}
              total={r.counts.unproductive}
              detalle={(p) =>
                `${p.unproductivePct ?? 0}%, ${horasCortas(p.nonProductiveSecs)} de ${horasCortas(p.trackedSecs)}`
              }
              vacio="Nadie en aplicaciones improductivas"
            />
            <Ranking
              titulo="Más efectivo"
              personas={r.mostEffective}
              total={r.counts.effective}
              detalle={(p) =>
                `${p.effectivenessPct ?? 0}%, ${horasCortas(p.productiveSecs)} de ${horasCortas(p.productiveSecs + p.nonProductiveSecs)}`
              }
              vacio="Sin tiempo clasificado"
            />
            <Ranking
              titulo="Tiempo total de BCWork"
              personas={r.mostTracked}
              total={r.counts.tracked}
              detalle={(p) => horasCortas(p.trackedSecs)}
              vacio="Sin actividad"
            />
          </div>

          {/* Rankings, fila 2 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Ranking
              titulo="Tarde"
              personas={r.late}
              total={r.counts.late}
              detalle={(p) =>
                `(${hms(p.lateSecs)}) · ${p.lateDays} día${p.lateDays === 1 ? '' : 's'}`
              }
              vacio="Nadie llegó tarde"
            />
            <Ranking
              titulo="Ausencia"
              personas={r.absent}
              total={r.counts.absent}
              detalle={(p) =>
                `${p.absentDays} día${p.absentDays === 1 ? '' : 's'} sin actividad con horario`
              }
              vacio="Nadie está ausente"
            />
            <Ranking
              titulo="Mayor tiempo registrado sin conexión"
              personas={r.mostIdle}
              total={r.counts.idle}
              detalle={(p) => hms(p.idleSecs)}
              vacio="Sin inactividad registrada"
            />
          </div>

          {/* Apps */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ColumnaApps
              titulo="Aplicaciones productivas"
              color={COLOR.productivo}
              href="/admin/apps"
              {...data.apps!.productive}
            />
            <ColumnaApps
              titulo="Aplicaciones improductivas"
              color={COLOR.improductivo}
              href="/admin/apps"
              {...data.apps!.nonProductive}
            />
            <ColumnaApps
              titulo="Aplicaciones neutrales"
              color={COLOR.inactivo}
              href="/admin/apps"
              {...data.apps!.neutral}
            />
          </div>
        </>
      )}
    </div>
  )
}
