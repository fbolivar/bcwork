'use client'

import { useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'

const FEATURE_LABELS: Record<string, { label: string; desc: string }> = {
  sso: { label: 'SSO / SAML', desc: 'Autenticación empresarial' },
  api_access: { label: 'API Access', desc: 'Acceso a la API pública' },
  payroll_export: { label: 'Export Nómina', desc: 'Exportación de liquidaciones' },
  office_vs_remote: { label: 'Oficina vs Remoto', desc: 'Métricas de ubicación' },
  productivity_map: { label: 'Mapa Productividad', desc: 'Heatmap de actividad' },
  scheduled_reports: { label: 'Reportes programados', desc: 'Envío automático de informes' },
  extended_retention: { label: 'Retención extendida', desc: 'Datos históricos >12 meses' },
}

function AdoptionBar({ pct }: { pct: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.style.width = `${pct}%`
  }, [pct])
  const color = pct >= 60 ? 'bg-green-500' : pct >= 30 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div ref={ref} className={`h-full rounded-full transition-all ${color}`} />
    </div>
  )
}

export function FeatureAdoptionPanel() {
  const { data, isLoading } = trpc.platform.getFeatureAdoption.useQuery(undefined, {
    refetchInterval: 300_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  const features = data?.features ?? []
  const total = data?.totalLicenses ?? 0

  const sorted = [...features].sort((a, b) => b.pct - a.pct)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Licencias activas</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Feature más adoptada</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {sorted[0] ? (FEATURE_LABELS[sorted[0].key]?.label ?? sorted[0].key) : '—'}
          </p>
          <p className="text-xs text-green-600">{sorted[0]?.pct ?? 0}% de tenants</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Feature con menor adopción</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {sorted.at(-1)
              ? (FEATURE_LABELS[sorted.at(-1)!.key]?.label ?? sorted.at(-1)!.key)
              : '—'}
          </p>
          <p className="text-xs text-red-500">{sorted.at(-1)?.pct ?? 0}% de tenants</p>
        </div>
      </div>

      {/* Barras de adopción */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-5 text-sm font-semibold text-gray-700">Adopción por feature</h2>
        <div className="space-y-4">
          {sorted.map((f) => {
            const meta = FEATURE_LABELS[f.key]
            return (
              <div key={f.key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      {meta?.label ?? f.key}
                    </span>
                    {meta?.desc && <span className="ml-2 text-xs text-gray-400">{meta.desc}</span>}
                    {f.overridden > 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                        {f.overridden} override{f.overridden !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{f.pct}%</span>
                    <span className="ml-1 text-xs text-gray-400">
                      ({f.enabled}/{f.total})
                    </span>
                  </div>
                </div>
                <AdoptionBar pct={f.pct} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Feature</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Habilitadas</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Overrides</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Adopción</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Distribución</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((f) => (
              <tr key={f.key} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">
                    {FEATURE_LABELS[f.key]?.label ?? f.key}
                  </p>
                  <p className="text-xs text-gray-400">{FEATURE_LABELS[f.key]?.desc}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{f.enabled}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {f.overridden > 0 ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      {f.overridden}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-sm font-bold ${f.pct >= 60 ? 'text-green-600' : f.pct >= 30 ? 'text-amber-600' : 'text-red-500'}`}
                  >
                    {f.pct}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <AdoptionBar pct={f.pct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
