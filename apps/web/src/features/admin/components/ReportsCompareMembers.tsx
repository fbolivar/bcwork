'use client'

import { Download } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { horasCortas, iniciales } from './panel-identidad'
import { downloadXlsx } from '@/lib/xlsx'

/** Comparar por miembros: la misma fuente que el Resumen, persona por persona. */

export function ReportsCompareMembers({ from, to }: { from: string; to: string }) {
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
