'use client'

import { trpc } from '@/lib/trpc-client'
import { ShieldAlert, TrendingDown } from 'lucide-react'

const RISK_CONFIG = {
  high: { label: 'Alto riesgo', color: 'text-red-700', bg: 'bg-red-100', bar: 'bg-red-500' },
  medium: {
    label: 'Riesgo medio',
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    bar: 'bg-yellow-400',
  },
  low: { label: 'Bajo riesgo', color: 'text-green-700', bg: 'bg-green-100', bar: 'bg-green-400' },
}

function FactorRow({ label, value, risk }: { label: string; value: string; risk?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className={`text-[10px] font-medium ${risk ? 'text-red-600' : 'text-gray-600'}`}>
        {value}
      </span>
    </div>
  )
}

export function RetentionPanel() {
  const { data, isLoading } = trpc.manager.getRetentionScores.useQuery()
  const scores = (data ?? []) as any[]

  const highCount = scores.filter((s) => s.risk_level === 'high').length
  const medCount = scores.filter((s) => s.risk_level === 'medium').length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Riesgo de fuga</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Score de retención basado en actividad, ausencias, PIP y compensación
        </p>
      </div>

      {/* Summary */}
      {scores.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-red-50 bg-red-50 p-3 text-center">
            <p className="text-[10px] text-red-400">Alto riesgo</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{highCount}</p>
          </div>
          <div className="rounded-xl border border-yellow-50 bg-yellow-50 p-3 text-center">
            <p className="text-[10px] text-yellow-400">Riesgo medio</p>
            <p className="mt-1 text-2xl font-bold text-yellow-600">{medCount}</p>
          </div>
          <div className="rounded-xl border border-green-50 bg-green-50 p-3 text-center">
            <p className="text-[10px] text-green-500">Bajo riesgo</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {scores.length - highCount - medCount}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : scores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Sin datos suficientes para calcular riesgo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.map((s: any) => {
            const rc = RISK_CONFIG[s.risk_level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.low
            const f = s.factors
            const tenureYears = f.tenure_days ? (f.tenure_days / 365).toFixed(1) : null
            const sinceRaise = f.days_since_raise
              ? f.days_since_raise > 365
                ? `${(f.days_since_raise / 365).toFixed(1)} años`
                : `${f.days_since_raise} días`
              : null
            return (
              <div
                key={s.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <div className="px-4 pb-2 pt-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                      {(s.full_name ?? s.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800">
                          {s.full_name ?? s.email}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${rc.color}`}>{s.risk_score}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${rc.bg} ${rc.color}`}
                          >
                            {rc.label}
                          </span>
                        </div>
                      </div>
                      {s.department && (
                        <p className="text-[10px] text-gray-400">
                          {s.department}
                          {s.position && ` · ${s.position}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Risk bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-1.5 rounded-full ${rc.bar}`}
                      style={{ width: `${s.risk_score}%` }}
                    />
                  </div>
                </div>

                {/* Factors */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 border-t border-gray-50 px-4 py-2.5">
                  <FactorRow
                    label="Días activo (últimos 30d)"
                    value={`${f.days_active_30d} días`}
                    risk={f.days_active_30d < 5}
                  />
                  <FactorRow
                    label="Ausencias (últimos 90d)"
                    value={`${f.absence_days_90d} días`}
                    risk={f.absence_days_90d > 10}
                  />
                  <FactorRow
                    label="PIP activo"
                    value={f.has_active_pip ? 'Sí' : 'No'}
                    risk={f.has_active_pip}
                  />
                  <FactorRow
                    label="eNPS personal"
                    value={f.enps_score !== null ? `${f.enps_score}/10` : 'Sin dato'}
                    risk={f.enps_score !== null && f.enps_score <= 6}
                  />
                  {sinceRaise && (
                    <FactorRow
                      label="Desde último aumento"
                      value={sinceRaise}
                      risk={f.days_since_raise > 540}
                    />
                  )}
                  {tenureYears && <FactorRow label="Antigüedad" value={`${tenureYears} años`} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        <TrendingDown className="mr-1 inline h-3 w-3" />
        Score calculado con: actividad reciente, ausencias, PIP activo, eNPS y tiempo sin aumento.
        Factores en rojo indican señales de alerta.
      </p>
    </div>
  )
}
