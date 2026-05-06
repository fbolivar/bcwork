'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Heart, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function WellnessRing({ score }: { score: number }) {
  const r = 44
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - score / 100)
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg className="-rotate-90" width="128" height="128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-gray-900">{score}</p>
        <p className="text-[10px] text-gray-400">/ 100</p>
      </div>
    </div>
  )
}

type Period = 7 | 14 | 30

export function MyWellnessDashboard() {
  const [days, setDays] = useState<Period>(30)
  const { data, isLoading } = trpc.employee.getMyWellness.useQuery({ days })

  const LEGAL_LIMIT_MONTHLY_SECS = 50 * 3600

  const overtimeAlert = days === 30 && (data?.totalOvertimeSecs ?? 0) > LEGAL_LIMIT_MONTHLY_SECS

  const wellnessLabel = !data
    ? ''
    : data.wellnessScore >= 80
      ? 'Excelente bienestar'
      : data.wellnessScore >= 60
        ? 'Buen equilibrio'
        : data.wellnessScore >= 40
          ? 'Cuidado recomendado'
          : 'Riesgo de agotamiento'

  const wellnessColor = !data
    ? 'text-gray-500'
    : data.wellnessScore >= 80
      ? 'text-green-600'
      : data.wellnessScore >= 60
        ? 'text-yellow-600'
        : 'text-red-600'

  const series = data?.overTimeSeries ?? []
  const maxSecs = Math.max(...series.map((s) => s.activeSecs), 1)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mi bienestar laboral</h1>
          <p className="mt-0.5 text-sm text-gray-500">Equilibrio entre trabajo y descanso</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {([7, 14, 30] as Period[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${days === d ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Ley 2121 alert */}
      {overtimeAlert && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700">Límite legal superado</p>
            <p className="mt-0.5 text-xs text-red-600">
              Acumulaste {fmtHours(data?.totalOvertimeSecs ?? 0)} de horas extra este mes, superando
              el límite de 50h permitido por la <strong>Ley 2121 de 2021</strong>. Tienes derecho a
              compensación o descanso compensatorio. Habla con tu empleador.
            </p>
          </div>
        </div>
      )}

      {/* Wellness score + KPIs */}
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        data && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <WellnessRing score={data.wellnessScore} />
              <div className="flex-1">
                <p className={`text-lg font-semibold ${wellnessColor}`}>{wellnessLabel}</p>
                <p className="mt-1 text-sm text-gray-500">
                  Basado en horas trabajadas, frecuencia de horas extra y productividad en los
                  últimos {days} días.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: 'Promedio diario',
                      value: `${data.avgDailyHours}h`,
                      note: 'recomendado: 7-8h',
                    },
                    { label: 'Productividad', value: `${data.avgProductivity}%`, note: 'promedio' },
                    {
                      label: 'Días con extra',
                      value: `${data.daysWithOvertime}`,
                      note: `de ${data.totalDays} días`,
                    },
                    {
                      label: 'Total horas extra',
                      value: fmtHours(data.totalOvertimeSecs),
                      note: 'acumulado',
                    },
                  ].map((k) => (
                    <div key={k.label} className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[11px] text-gray-500">{k.label}</p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">
                        {k.value}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{k.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Activity bar chart */}
      {series.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Actividad diaria</h3>
          <div className="flex items-end gap-0.5" style={{ height: 80 }}>
            {series.map((s) => {
              const h = Math.round((s.activeSecs / maxSecs) * 80)
              const hasOvertime = s.overtimeSecs > 0
              return (
                <div
                  key={s.date}
                  title={`${s.date}: ${fmtHours(s.activeSecs)}${hasOvertime ? ` (${fmtHours(s.overtimeSecs)} extra)` : ''}`}
                  style={{ height: `${h}px` }}
                  className={`min-w-0 flex-1 rounded-t-sm transition-all ${hasOvertime ? 'bg-yellow-400' : 'bg-blue-400'}`}
                />
              )
            })}
          </div>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-blue-400" />
              <span className="text-[11px] text-gray-500">Normal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-yellow-400" />
              <span className="text-[11px] text-gray-500">Con horas extra</span>
            </div>
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      {data && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
            <Heart className="h-4 w-4" />
            Recomendaciones
          </div>
          <ul className="mt-2 space-y-1.5 text-xs text-blue-700">
            {data.avgDailyHours > 9 && (
              <li className="flex items-start gap-1.5">
                <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                Estás trabajando más de 9h/día en promedio. Tomar descansos regulares mejora la
                productividad a largo plazo.
              </li>
            )}
            {data.daysWithOvertime > days * 0.4 && (
              <li className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
                Más del 40% de tus días de trabajo incluyen horas extra. Esto puede generar fatiga
                acumulada.
              </li>
            )}
            {data.avgProductivity < 40 && (
              <li className="flex items-start gap-1.5">
                <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                Tu productividad promedio es baja. Revisar los descansos y la gestión del tiempo
                puede ayudar.
              </li>
            )}
            {data.wellnessScore >= 75 && (
              <li>¡Buen trabajo manteniendo el equilibrio! Sigue así.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
