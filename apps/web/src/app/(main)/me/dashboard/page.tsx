'use client'

import { trpc } from '@/lib/trpc-client'
import { MyDayPanel } from '@/features/employee/components/MyDayPanel'
import { MyDayOverview } from '@/features/employee/components/MyDayOverview'
import { MyScheduleNotice } from '@/features/employee/components/MyScheduleNotice'
import { AlertTriangle, MonitorDown, CheckCircle2 } from 'lucide-react'
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
  const { data: metrics30 } = trpc.employee.getMyMetrics.useQuery({ days: 30 })

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
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <MonitorDown className="h-5 w-5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Aún no hay un agente vinculado a tu cuenta
            </p>
            <p className="text-xs text-amber-600">
              Tu administrador instala el agente en tu equipo. Cuando esté activo, verás aquí tu
              actividad.
            </p>
          </div>
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

      {/* Sesión activa y check-in manual */}
      <MyDayPanel />

      {/* Mi día: llegada, salida, productividad, apps y categorías */}
      <MyDayOverview />

      <MyScheduleNotice />
    </div>
  )
}
