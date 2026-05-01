'use client'

import { trpc } from '@/lib/trpc-client'
import { Users, Users2, Clock, Monitor, Cpu, ShieldCheck } from 'lucide-react'

export function DashboardStats() {
  const { data, isLoading } = trpc.admin.getStats.useQuery(undefined, { refetchInterval: 60_000 })

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const cards = [
    {
      label: 'Usuarios activos',
      value: data.activeUsers,
      sub: `${data.totalUsers} registrados`,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Equipos',
      value: data.teamsCount,
      sub: 'configurados',
      icon: Users2,
      color: 'indigo',
    },
    {
      label: 'Horarios',
      value: data.schedulesCount,
      sub: 'de trabajo',
      icon: Clock,
      color: 'violet',
    },
    {
      label: 'Sesiones activas',
      value: data.activeSessions,
      sub: 'ahora mismo',
      icon: Monitor,
      color: 'green',
    },
    {
      label: 'Seats',
      value: data.licenseSeats,
      sub: data.licenseStatus === 'trial' ? 'trial' : 'licenciados',
      icon: Cpu,
      color: 'yellow',
    },
    {
      label: 'Cumplimiento',
      value: '—',
      sub: 'HABEAS DATA activo',
      icon: ShieldCheck,
      color: 'emerald',
    },
  ] as const

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    violet: 'bg-violet-50 text-violet-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
              <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
            </div>
            <div className={`rounded-lg p-2 ${colorMap[color] ?? 'bg-gray-100 text-gray-500'}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
