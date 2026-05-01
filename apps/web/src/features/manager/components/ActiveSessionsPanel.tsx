'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Wifi, MapPin, Clock } from 'lucide-react'

function elapsed(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function ratio(active: number, idle: number): number {
  const total = active + idle
  return total > 0 ? active / total : 0
}

interface Props {
  teamId?: string
}

export function ActiveSessionsPanel({ teamId }: Props) {
  const { data, isLoading, refetch } = trpc.manager.getActiveSessions.useQuery({ teamId })

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const id = setInterval(() => void refetch(), 30000)
    return () => clearInterval(id)
  }, [refetch])

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
  }

  const sessions = data ?? []

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12">
        <Wifi className="mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-400">No hay sesiones activas en este momento</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">
        {sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} activa
        {sessions.length !== 1 ? 's' : ''} · actualiza cada 30s
      </p>
      {sessions.map((s) => {
        const pct = Math.round(ratio(s.active_seconds, s.idle_seconds) * 100)
        return (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{s.full_name ?? s.email}</p>
                <p className="text-xs text-gray-400">{s.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {elapsed(s.elapsed_seconds)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {s.location_type === 'office' ? 'Oficina' : 'Remoto'}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span>{pct}%</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
