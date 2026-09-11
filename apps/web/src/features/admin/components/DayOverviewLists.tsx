'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { COLOR, horasCortas, iniciales } from './panel-identidad'
import { ColumnaApps } from '@/features/shared/panel-widgets'
import type { Persona, App } from '@/server/day-overview'

/** Rankings del día y columnas de aplicaciones. */

function Avatar({ nombre }: { nombre: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
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
    <div className="flex min-h-[170px] flex-col rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{titulo}</p>
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
                    className="block truncate text-sm font-medium text-gray-800 hover:text-blue-700"
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
              className="mt-3 self-start text-xs text-blue-600 hover:underline"
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="grid gap-3 lg:grid-cols-3">
      <ColumnaApps
        titulo="Productivas"
        color={COLOR.productivo}
        href="/admin/apps"
        {...a.productive}
      />
      <ColumnaApps
        titulo="Improductivas"
        color={COLOR.improductivo}
        href="/admin/apps"
        {...a.nonProductive}
      />
      <ColumnaApps titulo="Neutrales" color={COLOR.inactivo} href="/admin/apps" {...a.neutral} />
    </div>
  )
}
