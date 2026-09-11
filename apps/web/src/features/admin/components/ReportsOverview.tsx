'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Check, Users, AppWindow, Globe } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  type TooltipProps,
} from 'recharts'
import { trpc } from '@/lib/trpc-client'
import { COLOR } from './panel-identidad'
import type { PersonaInforme } from '@/server/reports-overview'

/**
 * Informes > Resumen, con la composición de las herramientas del mercado:
 * filtros, seis tarjetas, barra de productividad, rankings y aplicaciones.
 */

/** 20h 28m 34s */
function hms(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.round(secs % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
/** 501h 7m */
function hm(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.round((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
/** 11:34:01 */
function reloj(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.round(secs % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function Tarjeta({
  titulo,
  valor,
  tono = 'ok',
}: {
  titulo: string
  valor: string
  tono?: 'ok' | 'mal' | 'neutro'
}) {
  const color = tono === 'ok' ? 'text-green-600' : tono === 'mal' ? 'text-red-500' : 'text-gray-400'
  return (
    <div className="flex gap-5 rounded-2xl bg-white p-7 shadow-sm">
      <div className="w-1.5 shrink-0 rounded-full bg-gray-400" />
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-gray-700">{titulo}</p>
        <p className={`mt-2 text-4xl font-medium tabular-nums ${color}`}>{valor}</p>
      </div>
    </div>
  )
}

function Filtro({
  etiqueta,
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
        className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-800 hover:bg-gray-50"
      >
        {etiqueta}
        <span className="rounded bg-blue-600 px-1.5 py-0.5 text-xs font-semibold text-white">
          {valor.length || opciones.length}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>
      {abierto && (
        <div className="absolute left-0 top-14 z-20 max-h-64 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase text-blue-600 hover:bg-blue-50"
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
                {o.sub && <span className="text-xs text-gray-400">{o.sub}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Avatar({ nombre }: { nombre: string }) {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-300 text-2xl font-medium text-white">
      {(nombre.trim()[0] ?? '?').toUpperCase()}
    </span>
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
  return (
    <div className="flex min-h-[420px] flex-col rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-700">{titulo}</p>
      {personas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-400">
          <Users className="h-14 w-14 text-gray-300" strokeWidth={1.4} />
          <p className="text-lg text-gray-800">{vacio}</p>
        </div>
      ) : (
        <ul className="mt-6 flex-1 space-y-5">
          {personas.map((p) => (
            <li key={p.userId} className="flex items-center gap-4">
              <Avatar nombre={p.name} />
              <div className="min-w-0">
                <Link
                  href={`/admin/users?u=${p.userId}`}
                  className="block truncate text-base font-semibold text-blue-600 hover:underline"
                >
                  {p.name}
                </Link>
                <p className="text-sm text-gray-700">{detalle(p)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 border-t border-gray-200 pt-5">
        {total > 0 ? (
          <Link
            href="/admin/reports?tab=miembros"
            className="text-base font-semibold text-blue-600 hover:underline"
          >
            Ver todo ({total})
          </Link>
        ) : (
          <span className="text-base font-semibold uppercase text-gray-400">Ver todo</span>
        )}
      </div>
    </div>
  )
}

function ColumnaApps({
  titulo,
  top,
}: {
  titulo: string
  top: { name: string; seconds: number }[]
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-700">{titulo}</p>
      {top.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Sin uso registrado</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {top.map((a) => {
            const esWeb = a.name.includes('.') && !/\.exe$/i.test(a.name)
            return (
              <li key={a.name} className="flex items-center justify-between py-3 text-base">
                <span className="flex min-w-0 items-center gap-3 text-gray-800">
                  {esWeb ? (
                    <Globe className="h-5 w-5 shrink-0 text-gray-400" />
                  ) : (
                    <AppWindow className="h-5 w-5 shrink-0 text-gray-400" />
                  )}
                  <span className="truncate" title={a.name}>
                    {a.name.replace(/\.exe$/i, '')}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-gray-700">{hms(a.seconds)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function TooltipPerfil({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const v = (k: string) => payload.find((p) => p.dataKey === k)?.value ?? 0
  return (
    <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow">
      <p className="mb-2 font-semibold text-gray-900">{label}</p>
      {(
        [
          ['nonProductive', 'improductivo', COLOR.improductivo],
          ['neutral', 'neutral', COLOR.neutral],
          ['productive', 'productivo', COLOR.productivo],
        ] as const
      ).map(([k, l, c]) => (
        <p key={k} className="flex items-center gap-2 text-gray-800">
          <span className="inline-block h-3 w-3" style={{ background: c }} />
          <span className="w-24">{l}</span>
          <span className="font-semibold">{v(k)}%</span>
        </p>
      ))}
    </div>
  )
}

export function ReportsOverview({ from, to }: { from: string; to: string }) {
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [userIds, setUserIds] = useState<string[]>([])
  const [aplicado, setAplicado] = useState<{ team_ids: string[]; user_ids: string[] }>({
    team_ids: [],
    user_ids: [],
  })

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
  const perfil = (data?.profile ?? []).filter((p) => p.bucket >= 6) // desde las 03:00, como la referencia

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-sm">
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
          className="ml-auto text-sm font-bold uppercase tracking-wide text-blue-600 hover:underline"
        >
          Aplicar filtro
        </button>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : !data.hasData || !k || !r ? (
        <div className="rounded-2xl bg-white px-4 py-16 text-center shadow-sm">
          <p className="text-lg text-gray-800">No se han recopilado datos</p>
          <p className="mt-1 text-sm text-gray-500">
            Sin actividad registrada en este período para {data.people} persona
            {data.people === 1 ? '' : 's'}.
          </p>
        </div>
      ) : (
        <>
          {/* Seis tarjetas */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Tarjeta titulo="Tiempo de BCWork" valor={hm(k.trackedSecs)} />
            <Tarjeta titulo="Tiempo en el trabajo" valor={hm(k.atWorkSecs)} />
            <Tarjeta titulo="Tiempo sin conexión" valor={hm(k.idleSecs)} tono="mal" />
            <Tarjeta
              titulo="Duración de los proyectos"
              valor={k.projectSecs > 0 ? hm(k.projectSecs) : '–'}
              tono={k.projectSecs > 0 ? 'ok' : 'neutro'}
            />
            <Tarjeta
              titulo="Eficacia"
              valor={k.effectivenessPct === null ? '–' : `${k.effectivenessPct}%`}
              tono={k.effectivenessPct === null ? 'neutro' : 'ok'}
            />
            <Tarjeta
              titulo="Productividad"
              valor={k.productivityPct === null ? '–' : `${k.productivityPct}%`}
              tono={k.productivityPct === null ? 'neutro' : 'ok'}
            />
          </div>

          {/* Barra de productividad */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-700">
              Barra de productividad
            </p>
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perfil} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 13, fill: '#374151', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    interval={5}
                  />
                  <YAxis
                    tick={{ fontSize: 13, fill: '#9ca3af', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    width={48}
                  />
                  <Tooltip content={<TooltipPerfil />} />
                  <Area
                    type="monotone"
                    dataKey="productive"
                    stackId="1"
                    stroke="none"
                    fill={COLOR.productivo}
                    fillOpacity={0.75}
                  />
                  <Area
                    type="monotone"
                    dataKey="neutral"
                    stackId="1"
                    stroke="none"
                    fill={COLOR.neutral}
                    fillOpacity={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="nonProductive"
                    stackId="1"
                    stroke="none"
                    fill={COLOR.improductivo}
                    fillOpacity={0.75}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rankings, fila de cuatro */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Ranking
              titulo="Más productivo"
              personas={r.mostProductive}
              total={r.counts.productive}
              detalle={(p) =>
                `${p.productivityPct ?? 0}%, ${hm(p.productiveSecs)} of ${hm(p.trackedSecs)}`.replace(
                  ' of ',
                  ' de ',
                )
              }
              vacio="Sin actividad"
            />
            <Ranking
              titulo="Más improductivo"
              personas={r.mostUnproductive}
              total={r.counts.unproductive}
              detalle={(p) =>
                `${p.unproductivePct ?? 0}%, ${hm(p.nonProductiveSecs)} de ${hm(p.trackedSecs)}`
              }
              vacio="Nadie es improductivo"
            />
            <Ranking
              titulo="Más efectivo"
              personas={r.mostEffective}
              total={r.counts.effective}
              detalle={(p) =>
                `${p.effectivenessPct ?? 0}%, ${hm(p.productiveSecs)} de ${hm(p.productiveSecs + p.nonProductiveSecs)}`
              }
              vacio="Sin tiempo clasificado"
            />
            <Ranking
              titulo="Tiempo total de BCWork"
              personas={r.mostTracked}
              total={r.counts.tracked}
              detalle={(p) => hm(p.trackedSecs)}
              vacio="Sin actividad"
            />
          </div>

          {/* Rankings, fila de tres */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Ranking
              titulo="Tarde"
              personas={r.late}
              total={r.counts.late}
              detalle={(p) => `(${reloj(p.lateSecs)})`}
              vacio="Nadie ha llegado tarde"
            />
            <Ranking
              titulo="Ausencia"
              personas={r.absent}
              total={r.counts.absent}
              detalle={(p) => `${p.absentDays} día${p.absentDays === 1 ? '' : 's'}`}
              vacio="Nadie está ausente"
            />
            <Ranking
              titulo="Mayor tiempo registrado sin conexión"
              personas={r.mostIdle}
              total={r.counts.idle}
              detalle={(p) => reloj(p.idleSecs)}
              vacio="Sin tiempo sin conexión"
            />
          </div>

          {/* Aplicaciones */}
          <div className="grid gap-6 lg:grid-cols-3">
            <ColumnaApps titulo="Aplicaciones productivas" top={data.apps!.productive.top} />
            <ColumnaApps titulo="Aplicaciones improductivas" top={data.apps!.nonProductive.top} />
            <ColumnaApps titulo="Aplicaciones neutrales" top={data.apps!.neutral.top} />
          </div>
        </>
      )}
    </div>
  )
}
