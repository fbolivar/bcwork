'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Clock, Zap, Coffee, Shield } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export function MyDayPanel() {
  const { data: session, refetch: refetchSession } = trpc.employee.getActiveSession.useQuery()
  const { data: today, refetch: refetchToday } = trpc.employee.getTodayActivity.useQuery()
  const { data: schedule } = trpc.employee.getMySchedule.useQuery()

  // Reloj en vivo
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
      void refetchSession()
    }, 15000)
    return () => clearInterval(id)
  }, [refetchSession])

  const elapsedSecs = session
    ? Math.round((now - new Date(session.started_at).getTime()) / 1000)
    : 0

  const workdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const workdays = (schedule?.workdays ?? []) as number[]

  const productiveSecs = today?.productiveSeconds ?? 0
  const totalSecs = today?.totalActiveSeconds ?? 0
  const pct = totalSecs > 0 ? Math.round((productiveSecs / totalSecs) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Sesión activa */}
      <div
        className={`rounded-2xl p-6 ${session ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white'}`}
      >
        {session ? (
          <div>
            <div className="flex items-center gap-2 text-blue-200">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-300" />
              <span className="text-sm">Sesión activa</span>
            </div>
            <p className="mt-3 text-5xl font-bold tabular-nums">{fmtHours(elapsedSecs)}</p>
            <p className="mt-1 text-sm text-blue-200">desde las {fmtTime(session.started_at)}</p>
            <div className="mt-4 flex gap-6 text-sm">
              <span className="flex items-center gap-1.5 text-blue-100">
                <Zap className="h-4 w-4" />
                {fmtHours(session.active_seconds ?? 0)} activo
              </span>
              <span className="flex items-center gap-1.5 text-blue-200">
                <Coffee className="h-4 w-4" />
                {fmtHours(session.idle_seconds ?? 0)} inactivo
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-500">
            <Clock className="h-6 w-6 text-gray-300" />
            <div>
              <p className="font-medium text-gray-700">Sin sesión activa</p>
              <p className="text-sm">El agente iniciará la sesión cuando te pongas a trabajar</p>
            </div>
          </div>
        )}
      </div>

      {/* Resumen del día */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          label="Tiempo activo hoy"
          value={fmtHours(totalSecs)}
        />
        <StatCard
          icon={<Zap className="h-5 w-5 text-green-500" />}
          label="Tiempo productivo"
          value={fmtHours(productiveSecs)}
        />
        <StatCard
          icon={<Shield className="h-5 w-5 text-purple-500" />}
          label="Índice productividad"
          value={`${pct}%`}
        />
      </div>

      {/* Barra de productividad del día */}
      {totalSecs > 0 && (
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-gray-500">
            <span>Distribución de actividad hoy</span>
            <span>{pct}% productivo</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="bg-green-500" style={{ width: `${pct}%` }} />
            <div
              className="bg-red-300"
              style={{
                width: `${totalSecs > 0 ? Math.round((((today?.totalActiveSeconds ?? 0) - productiveSecs) / totalSecs) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="mt-1 flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Productivo
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-300" />
              No productivo
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gray-200" />
              Sin clasificar
            </span>
          </div>
        </div>
      )}

      {/* Horario asignado */}
      {schedule && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Mi horario asignado</h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>
              Entrada: <strong>{schedule.start_time}</strong>
            </span>
            <span>
              Salida: <strong>{schedule.end_time}</strong>
            </span>
            <span>
              Horas semanales: <strong>{schedule.weekly_hours}h</strong>
            </span>
            {schedule.disconnection_grace_minutes > 0 && (
              <span className="text-amber-600">
                Desconexión: <strong>{schedule.disconnection_grace_minutes}min</strong> antes de
                salida
              </span>
            )}
          </div>
          <div className="mt-3 flex gap-1">
            {workdayLabels.map((day, i) => (
              <span
                key={day}
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  workdays.includes(i) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top apps hoy */}
      {(today?.topApps ?? []).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Aplicaciones más usadas hoy</h3>
          <div className="space-y-2">
            {(today?.topApps ?? []).slice(0, 6).map((app, i) => {
              const maxSecs = today!.topApps[0]!.secs
              const pctApp = Math.round((app.secs / maxSecs) * 100)
              const color =
                app.productivity === 'productive'
                  ? 'bg-green-500'
                  : app.productivity === 'unproductive'
                    ? 'bg-red-400'
                    : 'bg-blue-400'
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 truncate text-xs text-gray-600">{app.name}</span>
                  <div className="flex-1">
                    <div className="h-4 overflow-hidden rounded bg-gray-100">
                      <div className={`h-full ${color}`} style={{ width: `${pctApp}%` }} />
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs tabular-nums text-gray-500">
                    {fmtHours(app.secs)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Aviso legal Ley 2191 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
        <strong>Derecho a la desconexión digital</strong> — Ley 2191/2022 te garantiza no ser
        contactado fuera de tu horario laboral. El monitoreo se pausa automáticamente al terminar tu
        jornada. Datos protegidos bajo Ley 1581/2012 (HABEAS DATA).
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
    </div>
  )
}
