'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  CalendarRange,
  HelpCircle,
} from 'lucide-react'
import { ReportsOverview } from './ReportsOverview'
import { ReportsCompareMembers } from './ReportsCompareMembers'

/**
 * Informes: encabezado con el período en el centro y el selector de rango a
 * la derecha, pestañas debajo, y el contenido de la pestaña activa.
 */

export type Modo = 'dia' | 'semana' | 'mes'

export function hoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function masDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function rango(ancla: string, modo: Modo): { from: string; to: string } {
  if (modo === 'dia') return { from: ancla, to: ancla }
  if (modo === 'semana') {
    const dow = new Date(`${ancla}T12:00:00Z`).getUTCDay()
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
function fechaLarga(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const PESTANAS = [
  { v: 'resumen', l: 'Resumen' },
  { v: 'miembros', l: 'Comparar por miembros' },
  { v: 'fecha', l: 'Comparar por fecha' },
  { v: 'overtime', l: 'Horas extra', href: '/admin/overtime' },
  { v: 'proyectos-vision', l: 'Visión general de proyectos' },
  { v: 'proyectos', l: 'Proyectos', href: '/admin/projects' },
] as const
type Pestana = (typeof PESTANAS)[number]['v']

export function ReportsPage() {
  const [pestana, setPestana] = useState<Pestana>('resumen')
  const [modo, setModo] = useState<Modo>('semana')
  const [ancla, setAncla] = useState(hoyLocal())
  const { from, to } = rango(ancla, modo)

  return (
    <div className="space-y-6">
      {/* Encabezado: título · período · rango · ayuda */}
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-normal text-gray-800">Informes</h1>

        <div className="mx-auto flex items-center rounded-xl bg-gray-100">
          <button
            type="button"
            onClick={() => setAncla(mover(ancla, modo, -1))}
            className="px-4 py-3 text-gray-600 hover:text-gray-900"
            title="Período anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[420px] text-center text-sm font-semibold text-gray-800">
            {from === to ? fechaLarga(from) : `${fechaLarga(from)} - ${fechaLarga(to)}`}
          </span>
          <button
            type="button"
            onClick={() => setAncla(mover(ancla, modo, 1))}
            disabled={from > hoyLocal()}
            className="px-4 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-30"
            title="Período siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          {(
            [
              ['dia', 'Día', Calendar],
              ['semana', 'Semana', CalendarDays],
              ['mes', 'Mes', CalendarRange],
            ] as const
          ).map(([v, l, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setModo(v)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition ${
                modo === v
                  ? 'bg-white font-semibold text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {l}
            </button>
          ))}
        </div>

        <Link
          href="/admin/report-builder"
          title="Constructor de informes y envíos programados"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          <HelpCircle className="h-5 w-5" />
        </Link>
      </div>

      {/* Pestañas */}
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {PESTANAS.map((p) =>
          'href' in p ? (
            <Link
              key={p.v}
              href={p.href}
              className="rounded-lg px-4 py-2.5 text-sm text-gray-500 hover:text-gray-800"
            >
              {p.l}
            </Link>
          ) : (
            <button
              key={p.v}
              type="button"
              onClick={() => setPestana(p.v)}
              className={`rounded-lg px-4 py-2.5 text-sm transition ${
                pestana === p.v
                  ? 'bg-white font-semibold text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {p.l}
            </button>
          ),
        )}
      </div>

      {pestana === 'resumen' && <ReportsOverview from={from} to={to} />}
      {pestana === 'miembros' && <ReportsCompareMembers from={from} to={to} />}
      {(pestana === 'fecha' || pestana === 'proyectos-vision') && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-14 text-center">
          <p className="text-base font-medium text-gray-700">
            {pestana === 'fecha' ? 'Comparar por fecha' : 'Visión general de proyectos'}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Esta vista todavía no está construida. El constructor de informes permite comparar
            períodos y exportar a Excel.
          </p>
        </div>
      )}
    </div>
  )
}
