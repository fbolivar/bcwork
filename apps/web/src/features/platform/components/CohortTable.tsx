'use client'

import { trpc } from '@/lib/trpc-client'

function pctColor(pct: number) {
  if (pct >= 80) return 'bg-green-500 text-white'
  if (pct >= 60) return 'bg-green-200 text-green-900'
  if (pct >= 40) return 'bg-amber-100 text-amber-900'
  if (pct >= 20) return 'bg-orange-100 text-orange-900'
  return 'bg-red-100 text-red-900'
}

export function CohortTable() {
  const { data, isLoading } = trpc.platform.getCohortAnalysis.useQuery(undefined, {
    refetchInterval: 600_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  const cohorts = data?.cohorts ?? []
  if (cohorts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
        <p className="text-sm text-gray-400">Sin datos suficientes para calcular cohorts</p>
        <p className="mt-1 text-xs text-gray-300">Se necesitan al menos 2 meses de historia</p>
      </div>
    )
  }

  const maxMonths = Math.max(...cohorts.map((c) => c.retained.length))

  return (
    <div className="space-y-6">
      {/* Explicación */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-xs text-blue-700">
          Cada fila = empresas que se registraron ese mes. Los porcentajes muestran cuántas
          permanecen activas en cada mes siguiente. <strong>100% = todas siguen activas.</strong>
        </p>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Cohorte</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Nuevas</th>
              {Array.from({ length: maxMonths }, (_, i) => (
                <th key={i} className="px-3 py-3 text-center font-medium text-gray-500">
                  Mes {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cohorts.map((cohort) => (
              <tr key={cohort.month} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{cohort.label}</td>
                <td className="px-4 py-3 text-center tabular-nums text-gray-600">{cohort.total}</td>
                {Array.from({ length: maxMonths }, (_, i) => {
                  const pct = cohort.retained[i]
                  return (
                    <td key={i} className="px-2 py-2 text-center">
                      {pct !== undefined ? (
                        <span
                          className={`inline-block min-w-[40px] rounded-md px-1.5 py-0.5 text-xs font-semibold ${pctColor(pct)}`}
                        >
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-200">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span>Leyenda:</span>
        {[
          { label: '≥80%', cls: 'bg-green-500 text-white' },
          { label: '60–79%', cls: 'bg-green-200 text-green-900' },
          { label: '40–59%', cls: 'bg-amber-100 text-amber-900' },
          { label: '20–39%', cls: 'bg-orange-100 text-orange-900' },
          { label: '<20%', cls: 'bg-red-100 text-red-900' },
        ].map((l) => (
          <span key={l.label} className={`rounded px-1.5 py-0.5 text-xs font-semibold ${l.cls}`}>
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
