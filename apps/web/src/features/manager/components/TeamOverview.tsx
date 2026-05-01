'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { BarChart } from '@/features/admin/components/charts/BarChart'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function RatioBar({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs tabular-nums text-gray-600">{pct}%</span>
    </div>
  )
}

interface Props {
  teamId?: string
}

export function TeamOverview({ teamId }: Props) {
  const [days, setDays] = useState(7)
  const [selected, setSelected] = useState<string | null>(null)

  const { data, isLoading } = trpc.manager.getTeamMetrics.useQuery({ teamId, days })
  const detail = trpc.manager.getUserDetail.useQuery(
    { userId: selected!, days },
    { enabled: !!selected },
  )

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
  }

  const { users = [], summary } = data ?? {}

  return (
    <div className="space-y-5">
      {/* Selector período */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                days === d ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        {summary && (
          <div className="flex gap-6 text-sm text-gray-500">
            <span>
              <strong className="text-gray-900">{summary.members_count}</strong> miembros activos
            </span>
            <span>
              Prod. prom:{' '}
              <strong className="text-gray-900">
                {Math.round(summary.avg_productivity_ratio * 100)}%
              </strong>
            </span>
            <span>
              Total:{' '}
              <strong className="text-gray-900">{fmtHours(summary.total_active_seconds)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Tabla de miembros */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Colaborador</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Tiempo activo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Productividad</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Horas extra</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Días</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Sin actividad en el período
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr
                key={u.user_id}
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => setSelected(selected === u.user_id ? null : u.user_id)}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-600">
                  {fmtHours(u.active_seconds)}
                </td>
                <td className="px-4 py-3">
                  <RatioBar ratio={u.productivity_ratio} />
                </td>
                <td
                  className={`px-4 py-3 text-xs tabular-nums ${u.overtime_seconds > 3600 ? 'text-red-500' : 'text-gray-400'}`}
                >
                  {u.overtime_seconds > 60 ? fmtHours(u.overtime_seconds) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{u.days_active}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalle de usuario seleccionado */}
      {selected && detail.data && (
        <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-800">
              {detail.data.user.full_name ?? detail.data.user.email}
            </h3>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Cerrar ×
            </button>
          </div>

          {detail.data.metrics.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-blue-700">Dominios más visitados</p>
              <BarChart
                data={(
                  (detail.data.metrics.at(-1)?.domains_top as Array<{
                    domain: string
                    secs: number
                  }>) ?? []
                )
                  .slice(0, 8)
                  .map((d) => ({ label: d.domain, value: d.secs, formatted: fmtHours(d.secs) }))}
              />
            </div>
          )}

          <div className="flex gap-4 text-xs text-blue-700">
            <span>
              Dispositivos activos: <strong>{detail.data.devices.length}</strong>
            </span>
            <span>
              Último acceso:{' '}
              <strong>
                {detail.data.user.last_login_at
                  ? new Date(detail.data.user.last_login_at).toLocaleDateString('es-CO')
                  : 'Nunca'}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
