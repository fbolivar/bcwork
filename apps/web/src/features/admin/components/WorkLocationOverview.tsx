'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { MapPin, Home, Building2, Plane, ChevronLeft, ChevronRight } from 'lucide-react'

type LocationType = 'home' | 'office' | 'travel' | 'other'

const LOC_MAP: Record<LocationType, { label: string; color: string; icon: React.ReactNode }> = {
  home: { label: 'Casa (WFH)', color: 'text-blue-600', icon: <Home className="h-4 w-4" /> },
  office: { label: 'Oficina', color: 'text-green-600', icon: <Building2 className="h-4 w-4" /> },
  travel: { label: 'Viaje', color: 'text-purple-600', icon: <Plane className="h-4 w-4" /> },
  other: { label: 'Otro', color: 'text-gray-500', icon: <MapPin className="h-4 w-4" /> },
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function WorkLocationOverview() {
  const today = todayStr()
  const [viewDate, setViewDate] = useState(today)

  const { data, isLoading } = trpc.admin.getTeamWorkLocationSummary.useQuery({ date: viewDate })

  function shiftDate(delta: number) {
    const d = new Date(viewDate + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setViewDate(d.toISOString().slice(0, 10))
  }

  const counts = (['home', 'office', 'travel', 'other'] as LocationType[]).map((t) => ({
    type: t,
    count: (data ?? []).filter((e) => e.location_type === t).length,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Ubicaciones del equipo</h2>
        <p className="mt-0.5 text-sm text-gray-500">Dónde está trabajando tu equipo</p>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-center">
          <p className="text-sm font-medium capitalize text-gray-700">{fmtDate(viewDate)}</p>
        </div>
        <button
          type="button"
          onClick={() => setViewDate(today)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => shiftDate(1)}
          disabled={viewDate >= today}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {counts.map(({ type, count }) => {
            const loc = LOC_MAP[type]
            return (
              <div key={type} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className={`flex items-center gap-1.5 ${loc.color}`}>
                  {loc.icon}
                  <span className="text-xs font-medium">{loc.label}</span>
                </div>
                <p className="mt-1.5 text-2xl font-bold text-gray-900">{count}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <MapPin className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Nadie ha declarado ubicación este día</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((entry) => {
            const loc = LOC_MAP[entry.location_type as LocationType]
            const user = entry.users as {
              id: string
              full_name: string
              position: string | null
              department: string | null
            } | null
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                  {(user?.full_name ?? 'U')[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{user?.full_name}</p>
                  {(user?.position ?? user?.department) && (
                    <p className="truncate text-xs text-gray-400">
                      {user?.position ?? user?.department}
                    </p>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 text-sm font-medium ${loc.color}`}>
                  {loc.icon}
                  {loc.label}
                </div>
                {entry.note && <span className="text-xs text-gray-400">· {entry.note}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
