'use client'

import { trpc } from '@/lib/trpc-client'
import { MyDayPanel } from '@/features/employee/components/MyDayPanel'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  MonitorDown,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

function greeting(name: string | null | undefined) {
  const hour = new Date().getHours()
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  return name ? `${saludo}, ${name.split(' ')[0]}` : saludo
}

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const LEGAL_LIMIT_SECS = 50 * 3600

export default function EmployeeDashboard() {
  const { data: profile } = trpc.employee.getMyProfile.useQuery()
  const { data: devices } = trpc.employee.getMyDevices.useQuery()
  const { data: metrics14 } = trpc.employee.getMyMetrics.useQuery({ days: 14 })
  const { data: metrics30 } = trpc.employee.getMyMetrics.useQuery({ days: 30 })

  // Dividir las últimas 2 semanas: esta semana vs semana anterior
  type RawRow = {
    metric_date: string | null
    active_seconds: number | null
    productive_seconds: number | null
    productivity_ratio: number
  }
  const allRows = (metrics14?.series ?? []) as RawRow[]
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const thisWeek = allRows.filter((r) => (r.metric_date ?? '') >= cutoff)
  const lastWeek = allRows.filter((r) => (r.metric_date ?? '') < cutoff)

  const thisActive = thisWeek.reduce((s, r) => s + (r.active_seconds ?? 0), 0)
  const lastActive = lastWeek.reduce((s, r) => s + (r.active_seconds ?? 0), 0)
  const thisProductivity =
    thisWeek.length > 0
      ? thisWeek.reduce((s, r) => s + r.productivity_ratio, 0) / thisWeek.length
      : 0
  const lastProductivity =
    lastWeek.length > 0
      ? lastWeek.reduce((s, r) => s + r.productivity_ratio, 0) / lastWeek.length
      : 0

  const activeDiff = lastActive > 0 ? Math.round(((thisActive - lastActive) / lastActive) * 100) : 0
  const productDiff = Math.round((thisProductivity - lastProductivity) * 100)

  // Horas extra mensuales
  const monthOvertime = metrics30?.summary.total_overtime_seconds ?? 0
  const overtimePct =
    LEGAL_LIMIT_SECS > 0 ? Math.min(100, Math.round((monthOvertime / LEGAL_LIMIT_SECS) * 100)) : 0

  // Estado del agente
  const activeDevices = (devices ?? []).filter((d) => !d.revoked_at)
  const hasAgent = activeDevices.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{greeting(profile?.full_name)} 👋</h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      {/* Alerta horas extra */}
      {monthOvertime > LEGAL_LIMIT_SECS * 0.8 && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${monthOvertime > LEGAL_LIMIT_SECS ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}
        >
          <AlertTriangle
            className={`mt-0.5 h-4 w-4 shrink-0 ${monthOvertime > LEGAL_LIMIT_SECS ? 'text-red-500' : 'text-yellow-500'}`}
          />
          <div>
            <p
              className={`text-sm font-medium ${monthOvertime > LEGAL_LIMIT_SECS ? 'text-red-800' : 'text-yellow-800'}`}
            >
              {monthOvertime > LEGAL_LIMIT_SECS
                ? `Superaste el límite legal — ${fmtHours(monthOvertime)} de horas extra este mes`
                : `Cerca del límite de horas extra — ${fmtHours(monthOvertime)} de ${fmtHours(LEGAL_LIMIT_SECS)} (${overtimePct}%)`}
            </p>
            <p
              className={`mt-0.5 text-xs ${monthOvertime > LEGAL_LIMIT_SECS ? 'text-red-600' : 'text-yellow-600'}`}
            >
              Ley 2121/2021 establece un máximo de 50 horas extra al mes.{' '}
              <Link href="/me/metrics" className="underline">
                Ver detalle →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Estado del agente */}
      {!hasAgent && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <MonitorDown className="h-5 w-5 shrink-0 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">Agente no instalado</p>
            <p className="text-xs text-blue-600">
              Sin el agente no se registra actividad ni sesiones.
            </p>
          </div>
          <Link
            href="/me/agent"
            className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Instalar agente
          </Link>
        </div>
      )}
      {hasAgent && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
          <p className="text-sm text-green-700">
            Agente activo en {activeDevices.length} dispositivo{activeDevices.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Panel del día */}
      <MyDayPanel />

      {/* Comparación semanal */}
      {(thisActive > 0 || lastActive > 0) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Esta semana vs semana anterior
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: 'Tiempo activo',
                current: fmtHours(thisActive),
                diff: activeDiff,
              },
              {
                label: 'Productividad',
                current: `${Math.round(thisProductivity * 100)}%`,
                diff: productDiff,
              },
            ].map((k) => {
              const up = k.diff > 0
              const neutral = k.diff === 0
              return (
                <div key={k.label} className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">{k.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{k.current}</p>
                  <div
                    className={`mt-1 flex items-center gap-1 text-xs font-medium ${neutral ? 'text-gray-400' : up ? 'text-green-600' : 'text-red-500'}`}
                  >
                    {neutral ? (
                      <Minus className="h-3 w-3" />
                    ) : up ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {neutral ? 'Sin cambio' : `${up ? '+' : ''}${k.diff}% vs semana anterior`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
