'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { horasCortas, iniciales } from './panel-identidad'
import { downloadXlsx } from '@/lib/xlsx'

/** Comparar por miembros: la misma fuente que el Resumen, persona por persona. */

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
function rango(ancla: string, modo: Modo) {
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

export function ReportsCompareMembers() {
  const [modo, setModo] = useState<Modo>('semana')
  const [ancla, setAncla] = useState(hoyLocal())
  const { from, to } = rango(ancla, modo)
  const { data, isLoading } = trpc.admin.getReportsOverview.useQuery(
    { from, to },
    { staleTime: 60_000 },
  )
  const filas = data?.people_detail ?? []

  const th =
    'px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400'
  const pct = (v: number | null) => (v === null ? '–' : `${v}%`)

  function exportar() {
    downloadXlsx(
      [
        {
          name: 'Miembros',
          header: [
            'Persona',
            'Tiempo BCWork (h)',
            'Productivo (h)',
            'Improductivo (h)',
            'Neutral (h)',
            'En el trabajo (h)',
            'Sin conexión (h)',
            'Productividad %',
            'Eficacia %',
            'Tarde (min)',
            'Días tarde',
            'Días ausente',
          ],
          rows: filas.map((p) => [
            p.name,
            Math.round((p.trackedSecs / 3600) * 100) / 100,
            Math.round((p.productiveSecs / 3600) * 100) / 100,
            Math.round((p.nonProductiveSecs / 3600) * 100) / 100,
            Math.round((p.neutralSecs / 3600) * 100) / 100,
            Math.round((p.atWorkSecs / 3600) * 100) / 100,
            Math.round((p.idleSecs / 3600) * 100) / 100,
            p.productivityPct,
            p.effectivenessPct,
            Math.round(p.lateSecs / 60),
            p.lateDays,
            p.absentDays,
          ]),
        },
      ],
      `bcwork-miembros-${from}-${to}`,
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={exportar}
          disabled={!filas.length}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Exportar
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setAncla(mover(ancla, modo, -1))}
              className="p-2 text-gray-500 hover:text-gray-900"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[200px] text-center text-xs font-medium text-gray-700">
              {from === to ? from : `${from} – ${to}`}
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
                className={`rounded-md px-3 py-1.5 text-sm ${modo === v ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="h-40 animate-pulse bg-gray-50" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className={th}>Persona</th>
                <th className={th}>Tiempo BCWork</th>
                <th className={th}>Productivo</th>
                <th className={th}>Improductivo</th>
                <th className={th}>En el trabajo</th>
                <th className={th}>Sin conexión</th>
                <th className={th}>Productividad</th>
                <th className={th}>Eficacia</th>
                <th className={th}>Tarde</th>
                <th className={th}>Ausente</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr
                  key={p.userId}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                        {iniciales(p.name)}
                      </span>
                      <span className="text-gray-800">{p.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">
                    {horasCortas(p.trackedSecs)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-green-700">
                    {horasCortas(p.productiveSecs)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-orange-600">
                    {horasCortas(p.nonProductiveSecs)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">
                    {horasCortas(p.atWorkSecs)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-500">
                    {horasCortas(p.idleSecs)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">
                    {pct(p.productivityPct)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">
                    {pct(p.effectivenessPct)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">
                    {p.lateDays
                      ? `${p.lateDays} día${p.lateDays === 1 ? '' : 's'} · ${Math.round(p.lateSecs / 60)} min`
                      : '–'}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-700">
                    {p.absentDays ? `${p.absentDays} día${p.absentDays === 1 ? '' : 's'}` : '–'}
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">
                    Sin datos en el período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
