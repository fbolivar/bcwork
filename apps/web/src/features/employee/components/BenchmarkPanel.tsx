'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'

function DeltaBadge({ my, team }: { my: number; team: number }) {
  const diff = my - team
  if (Math.abs(diff) < 1)
    return (
      <span className="flex items-center gap-0.5 text-xs text-gray-400">
        <Minus className="h-3 w-3" /> Igual al equipo
      </span>
    )
  if (diff > 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-green-600">
        <TrendingUp className="h-3 w-3" /> +{diff.toFixed(1)} sobre equipo
      </span>
    )
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-red-500">
      <TrendingDown className="h-3 w-3" /> {diff.toFixed(1)} bajo equipo
    </span>
  )
}

function ProgressBar({
  value,
  max,
  color = 'blue',
}: {
  value: number
  max: number
  color?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-400',
    purple: 'bg-purple-500',
  }
  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div
        className={`h-2 rounded-full ${colors[color] ?? colors.blue} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function BenchmarkPanel() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = trpc.employee.getTeamBenchmark.useQuery({ days })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mi rendimiento vs equipo</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Compara tus métricas con el promedio del equipo
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {([7, 14, 30, 90] as const).map((d) => (
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

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Productividad */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Productividad</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{data.my_productivity}%</p>
                <DeltaBadge my={data.my_productivity} team={data.team_avg_productivity} />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Promedio equipo</p>
                <p className="text-xl font-semibold text-gray-600">{data.team_avg_productivity}%</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Tú</span>
                  <span>{data.my_productivity}%</span>
                </div>
                <ProgressBar
                  value={data.my_productivity}
                  max={100}
                  color={data.my_productivity >= data.team_avg_productivity ? 'green' : 'orange'}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>Equipo</span>
                  <span>{data.team_avg_productivity}%</span>
                </div>
                <ProgressBar value={data.team_avg_productivity} max={100} color="blue" />
              </div>
            </div>
          </div>

          {/* Horas diarias */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Horas promedio/día</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{data.my_daily_hours}h</p>
                <DeltaBadge my={data.my_daily_hours} team={data.team_avg_daily_hours} />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Promedio equipo</p>
                <p className="text-xl font-semibold text-gray-600">{data.team_avg_daily_hours}h</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Tú</span>
                  <span>{data.my_daily_hours}h</span>
                </div>
                <ProgressBar value={data.my_daily_hours} max={12} color="purple" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>Equipo</span>
                  <span>{data.team_avg_daily_hours}h</span>
                </div>
                <ProgressBar value={data.team_avg_daily_hours} max={12} color="blue" />
              </div>
            </div>
          </div>

          {/* Contexto */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <BarChart3 className="h-5 w-5 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-600">
              Comparación con{' '}
              <span className="font-semibold">
                {data.team_size} compañero{data.team_size !== 1 ? 's' : ''}
              </span>{' '}
              en los últimos <span className="font-semibold">{data.days} días</span>
            </p>
          </div>

          {/* Resumen */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">
              {data.my_productivity >= data.team_avg_productivity &&
              data.my_daily_hours <= data.team_avg_daily_hours + 1
                ? '¡Excelente equilibrio! Eres más productivo con horas similares al equipo.'
                : data.my_productivity >= data.team_avg_productivity
                  ? '¡Buen rendimiento! Tu productividad supera el promedio del equipo.'
                  : data.my_daily_hours > data.team_avg_daily_hours + 2
                    ? 'Trabajas más horas que el equipo. Considera pausas para mantener la productividad.'
                    : 'Hay oportunidad de mejora. Revisa tu distribución de apps productivas.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <BarChart3 className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Sin datos suficientes</p>
          <p className="mt-1 text-xs text-gray-400">
            Necesitas sesiones registradas para ver el benchmark
          </p>
        </div>
      )}
    </div>
  )
}
