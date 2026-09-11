'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { COLOR, horasCortas, iniciales } from './panel-identidad'
import type { Persona, App } from '@/server/day-overview'

/** Rankings del día y columnas de aplicaciones. */

function Avatar({ nombre }: { nombre: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
      {iniciales(nombre) || '?'}
    </span>
  )
}

function Ranking({
  titulo,
  personas,
  detalle,
  vacio,
}: {
  titulo: string
  personas: Persona[]
  detalle: (p: Persona) => string
  vacio: string
}) {
  const [todo, setTodo] = useState(false)
  const lista = todo ? personas : personas.slice(0, 1)
  return (
    <div className="flex min-h-[190px] flex-col rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700">{titulo}</h3>
      {personas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
          <UserRound className="h-8 w-8" strokeWidth={1.2} />
          <p className="text-xs">{vacio}</p>
        </div>
      ) : (
        <>
          <ul className="mt-3 flex-1 space-y-3">
            {lista.map((p) => (
              <li key={p.userId} className="flex items-center gap-3">
                <Avatar nombre={p.name} />
                <div className="min-w-0">
                  <Link
                    href={`/admin/users?u=${p.userId}`}
                    className="block truncate text-sm font-semibold text-gray-800 underline-offset-2 hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="text-xs text-gray-500">{detalle(p)}</p>
                </div>
              </li>
            ))}
          </ul>
          {personas.length > 1 && (
            <button
              type="button"
              onClick={() => setTodo((v) => !v)}
              className="mt-3 self-start border-t border-gray-100 pt-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 hover:text-gray-900"
            >
              {todo ? 'Ver menos' : `Ver todo (${personas.length})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function horaLocal(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function DayRankings({
  r,
}: {
  r: {
    mostProductive: Persona[]
    mostUnproductive: Persona[]
    mostEffective: Persona[]
    mostIdle: Persona[]
    late: Persona[]
    absent: Persona[]
  }
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Ranking
        titulo="Más productivo"
        personas={r.mostProductive}
        detalle={(p) =>
          `${p.productivityPct ?? 0} %, ${horasCortas(p.productiveSecs)} de ${horasCortas(p.totalSecs)}`
        }
        vacio="Sin actividad"
      />
      <Ranking
        titulo="Más improductivo"
        personas={r.mostUnproductive}
        detalle={(p) =>
          `${p.totalSecs > 0 ? Math.round((p.nonProductiveSecs / p.totalSecs) * 100) : 0} %, ${horasCortas(p.nonProductiveSecs)} de ${horasCortas(p.totalSecs)}`
        }
        vacio="Nadie en aplicaciones improductivas"
      />
      <Ranking
        titulo="Más efectivo"
        personas={r.mostEffective}
        detalle={(p) =>
          `${p.effectivenessPct ?? 0} %, ${horasCortas(p.productiveSecs)} de ${horasCortas(p.productiveSecs + p.nonProductiveSecs)} clasificadas`
        }
        vacio="Sin tiempo clasificado"
      />
      <Ranking
        titulo="Mayor tiempo inactivo"
        personas={r.mostIdle}
        detalle={(p) => `${horasCortas(p.idleSecs)} con el equipo encendido sin interacción`}
        vacio="Sin inactividad registrada"
      />
      <Ranking
        titulo="Tarde"
        personas={r.late}
        detalle={(p) => `llegó ${horaLocal(p.arrivalAt)}, ${p.lateMinutes} min tarde`}
        vacio="Nadie ha llegado tarde"
      />
      <Ranking
        titulo="Ausente"
        personas={r.absent}
        detalle={() => 'sin actividad y con horario para hoy'}
        vacio="Nadie ausente"
      />
    </div>
  )
}

function ColumnaApps({
  titulo,
  color,
  total,
  count,
  top,
}: {
  titulo: string
  color: string
  total: number
  count: number
  top: App[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div
        className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-white"
        style={{ background: color }}
      >
        <span>{titulo}</span>
        <span className="tabular-nums">{horasCortas(total)}</span>
      </div>
      {top.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-gray-400">Sin uso registrado</p>
      ) : (
        <ul className="px-4 py-2">
          {top.map((a) => (
            <li key={a.name} className="flex items-center justify-between py-2 text-sm">
              <span className="truncate pr-3 text-gray-800" title={a.name}>
                {a.name}
              </span>
              <span className="shrink-0 tabular-nums text-gray-500">{horasCortas(a.seconds)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <Link
          href="/admin/apps"
          className="text-[11px] font-bold uppercase tracking-wide text-gray-500 hover:text-gray-900"
        >
          Ver todo ({count})
        </Link>
      </div>
    </div>
  )
}

export function DayApps({
  a,
}: {
  a: {
    productive: { total: number; count: number; top: App[] }
    nonProductive: { total: number; count: number; top: App[] }
    neutral: { total: number; count: number; top: App[] }
  }
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ColumnaApps titulo="Aplicaciones productivas" color={COLOR.productivo} {...a.productive} />
      <ColumnaApps
        titulo="Aplicaciones improductivas"
        color={COLOR.improductivo}
        {...a.nonProductive}
      />
      <ColumnaApps titulo="Aplicaciones neutrales" color="#6b7280" {...a.neutral} />
    </div>
  )
}
