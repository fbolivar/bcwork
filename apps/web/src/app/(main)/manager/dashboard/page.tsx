'use client'

import { trpc } from '@/lib/trpc-client'
import { ActiveSessionsPanel } from '@/features/manager/components/ActiveSessionsPanel'
import { TeamOverview } from '@/features/manager/components/TeamOverview'
import { Users, UserCheck, UserX, ClipboardEdit, Clock } from 'lucide-react'
import Link from 'next/link'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function ManagerDashboard() {
  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const firstTeam = teams?.[0]
  const teamId = firstTeam?.id

  const { data: status } = trpc.manager.getTeamStatus.useQuery({ teamId })
  const { data: pending } = trpc.manager.getPendingCorrectionsCount.useQuery()
  const { data: metrics } = trpc.manager.getTeamMetrics.useQuery({ teamId, days: 7 })

  const activeCount = status?.active.length ?? 0
  const inactiveCount = status?.inactive.length ?? 0
  const totalMembers = activeCount + inactiveCount
  const pendingCount = pending?.count ?? 0
  const weekOvertime = metrics?.users.reduce((s, u) => s + u.overtime_seconds, 0) ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Panel de Manager</h1>
        <p className="mt-1 text-sm text-gray-500">
          {firstTeam ? `Equipo: ${firstTeam.name}` : 'Vista general de todos los equipos'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
            <UserCheck className="h-3.5 w-3.5" />
            Activos ahora
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-green-700">{activeCount}</p>
          {totalMembers > 0 && (
            <p className="mt-0.5 text-xs text-green-500">de {totalMembers} miembros</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <UserX className="h-3.5 w-3.5" />
            Sin actividad hoy
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-gray-700">{inactiveCount}</p>
        </div>
        <div
          className={`rounded-xl border p-4 ${pendingCount > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}
        >
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${pendingCount > 0 ? 'text-yellow-600' : 'text-gray-500'}`}
          >
            <ClipboardEdit className="h-3.5 w-3.5" />
            Correcciones
          </div>
          <p
            className={`mt-1 text-3xl font-bold tabular-nums ${pendingCount > 0 ? 'text-yellow-700' : 'text-gray-700'}`}
          >
            {pendingCount}
          </p>
          {pendingCount > 0 && (
            <Link
              href="/manager/corrections"
              className="mt-0.5 block text-xs text-yellow-600 hover:underline"
            >
              Revisar →
            </Link>
          )}
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
            <Clock className="h-3.5 w-3.5" />
            Horas extra (semana)
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-blue-700">
            {fmtHours(weekOvertime)}
          </p>
          <p className="mt-0.5 text-xs text-blue-500">total equipo</p>
        </div>
      </div>

      {/* Estado hoy: inactivos */}
      {inactiveCount > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Sin actividad hoy ({inactiveCount})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(status?.inactive ?? []).slice(0, 9).map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {u.full_name ?? u.email}
                  </p>
                  {u.department && <p className="truncate text-xs text-gray-400">{u.department}</p>}
                </div>
              </div>
            ))}
            {inactiveCount > 9 && (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">
                +{inactiveCount - 9} más
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Sesiones activas ahora</h2>
        <ActiveSessionsPanel {...(teamId ? { teamId } : {})} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Rendimiento del equipo</h2>
        <TeamOverview {...(teamId ? { teamId } : {})} />
      </section>
    </div>
  )
}
