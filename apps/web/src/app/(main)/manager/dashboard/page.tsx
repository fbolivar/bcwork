'use client'

import dynamic from 'next/dynamic'
import { trpc } from '@/lib/trpc-client'
import { ActiveSessionsPanel } from '@/features/manager/components/ActiveSessionsPanel'
import { TeamOverview } from '@/features/manager/components/TeamOverview'
import { TimeOffPanel } from '@/features/manager/components/TimeOffPanel'
import { ManualTimePanel } from '@/features/manager/components/ManualTimePanel'

const GeoLocationWidget = dynamic(
  () =>
    import('@/features/manager/components/GeoLocationWidget').then((m) => ({
      default: m.GeoLocationWidget,
    })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-gray-100" /> },
)

import {
  Users,
  UserCheck,
  UserX,
  ClipboardEdit,
  Clock,
  Trophy,
  TrendingUp,
  Timer,
  Download,
} from 'lucide-react'
import Link from 'next/link'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

type MonthUser = {
  full_name: string | null
  email: string
  department: string | null
  active_seconds: number
  productivity_ratio: number
  overtime_seconds: number
  days_active: number
}

function exportMonthCSV(users: MonthUser[]) {
  const headers = [
    'Nombre',
    'Email',
    'Departamento',
    'Tiempo activo',
    'Productividad',
    'Horas extra',
    'Días activos',
  ]
  const rows = users.map((u) => [
    u.full_name ?? '',
    u.email,
    u.department ?? '',
    fmtHours(u.active_seconds),
    `${Math.round(u.productivity_ratio * 100)}%`,
    u.overtime_seconds > 60 ? fmtHours(u.overtime_seconds) : '0',
    String(u.days_active),
  ])
  const csv =
    '﻿' +
    [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `equipo-mes-${new Date().toISOString().slice(0, 7)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ManagerDashboard() {
  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const firstTeam = teams?.[0]
  const teamId = firstTeam?.id

  const { data: status } = trpc.manager.getTeamStatus.useQuery({ teamId })
  const { data: pending } = trpc.manager.getPendingCorrectionsCount.useQuery()
  const { data: metrics } = trpc.manager.getTeamMetrics.useQuery({ teamId, days: 7 })
  const { data: monthMetrics } = trpc.manager.getTeamMetrics.useQuery({ teamId, days: 30 })
  const { data: geoLocations = [] } = trpc.manager.getTeamGeoLocations.useQuery()

  const activeCount = status?.active.length ?? 0
  const inactiveCount = status?.inactive.length ?? 0
  const totalMembers = activeCount + inactiveCount
  const pendingCount = pending?.count ?? 0
  const weekOvertime = metrics?.users.reduce((s, u) => s + u.overtime_seconds, 0) ?? 0

  const monthUsers = monthMetrics?.users ?? []
  const monthTotalActive = monthUsers.reduce((s, u) => s + u.active_seconds, 0)
  const monthTotalOvertime = monthUsers.reduce((s, u) => s + u.overtime_seconds, 0)
  const monthAvgProd =
    monthUsers.length > 0
      ? Math.round(
          (monthUsers.reduce((s, u) => s + u.productivity_ratio, 0) / monthUsers.length) * 100,
        )
      : 0
  const topEmployee = [...monthUsers].sort((a, b) => b.active_seconds - a.active_seconds)[0] ?? null

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

      {/* Resumen del mes */}
      {monthUsers.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Resumen del mes —{' '}
              {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              type="button"
              title="Exportar CSV del mes"
              onClick={() => exportMonthCSV(monthUsers as MonthUser[])}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                <Timer className="h-3.5 w-3.5" />
                Horas equipo
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-700">
                {fmtHours(monthTotalActive)}
              </p>
              <p className="mt-0.5 text-xs text-indigo-400">{monthUsers.length} miembros activos</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <TrendingUp className="h-3.5 w-3.5" />
                Productividad
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-green-700">{monthAvgProd}%</p>
              <p className="mt-0.5 text-xs text-green-400">promedio del equipo</p>
            </div>
            <div
              className={`rounded-xl border p-4 ${monthTotalOvertime > 0 ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${monthTotalOvertime > 0 ? 'text-orange-600' : 'text-gray-500'}`}
              >
                <Clock className="h-3.5 w-3.5" />
                Horas extra
              </div>
              <p
                className={`mt-1 text-2xl font-bold tabular-nums ${monthTotalOvertime > 0 ? 'text-orange-700' : 'text-gray-700'}`}
              >
                {fmtHours(monthTotalOvertime)}
              </p>
              <p
                className={`mt-0.5 text-xs ${monthTotalOvertime > 0 ? 'text-orange-400' : 'text-gray-400'}`}
              >
                total equipo
              </p>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-600">
                <Trophy className="h-3.5 w-3.5" />
                Top empleado
              </div>
              {topEmployee ? (
                <>
                  <p className="mt-1 truncate text-sm font-bold text-yellow-800">
                    {topEmployee.full_name ?? topEmployee.email}
                  </p>
                  <p className="mt-0.5 text-xs text-yellow-500">
                    {fmtHours(topEmployee.active_seconds)} activo
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-yellow-600">—</p>
              )}
            </div>
          </div>
        </section>
      )}

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

      <section>
        <TimeOffPanel />
      </section>

      <section>
        <ManualTimePanel />
      </section>

      <section>
        <GeoLocationWidget locations={geoLocations} />
      </section>
    </div>
  )
}
