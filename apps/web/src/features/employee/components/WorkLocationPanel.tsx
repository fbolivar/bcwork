'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Home, Building2, Plane, MapPin, ChevronLeft, ChevronRight, Check } from 'lucide-react'

type LocationType = 'home' | 'office' | 'travel' | 'other'

const LOCATIONS: {
  type: LocationType
  label: string
  icon: React.ReactNode
  color: string
  bg: string
}[] = [
  {
    type: 'home',
    label: 'Casa (WFH)',
    icon: <Home className="h-6 w-6" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  {
    type: 'office',
    label: 'Oficina',
    icon: <Building2 className="h-6 w-6" />,
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
  },
  {
    type: 'travel',
    label: 'Viaje',
    icon: <Plane className="h-6 w-6" />,
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
  },
  {
    type: 'other',
    label: 'Otro',
    icon: <MapPin className="h-6 w-6" />,
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200',
  },
]

const LOC_MAP: Record<LocationType, { label: string; color: string }> = {
  home: { label: 'Casa (WFH)', color: 'text-blue-600' },
  office: { label: 'Oficina', color: 'text-green-600' },
  travel: { label: 'Viaje', color: 'text-purple-600' },
  other: { label: 'Otro', color: 'text-gray-500' },
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

export function WorkLocationPanel() {
  const utils = trpc.useUtils()
  const today = todayStr()
  const [note, setNote] = useState('')
  const [viewDate, setViewDate] = useState(today)

  const { data: myLocations, isLoading } = trpc.employee.getMyWorkLocations.useQuery({ days: 30 })
  const { data: teamLocations } = trpc.employee.getTeamWorkLocations.useQuery({ date: viewDate })

  const declare = trpc.employee.declareWorkLocation.useMutation({
    onSuccess: () => {
      utils.employee.getMyWorkLocations.invalidate()
      utils.employee.getTeamWorkLocations.invalidate()
      setNote('')
    },
  })

  const todayEntry = (myLocations ?? []).find((l) => l.date === today)

  function shiftDate(delta: number) {
    const d = new Date(viewDate + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setViewDate(d.toISOString().slice(0, 10))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mi ubicación hoy</h1>
        <p className="mt-0.5 text-sm text-gray-500">Declara dónde estás trabajando</p>
      </div>

      {/* Today declaration */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {new Date().toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LOCATIONS.map((loc) => {
            const active = todayEntry?.location_type === loc.type
            return (
              <button
                key={loc.type}
                type="button"
                onClick={() =>
                  declare.mutate({ date: today, location_type: loc.type, note: note || undefined })
                }
                disabled={declare.isPending}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 transition-all ${active ? loc.bg + ' ' + loc.color + ' border-current' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
              >
                {active && <Check className="absolute right-2 top-2 h-3.5 w-3.5" />}
                {loc.icon}
                <span className="text-xs font-medium">{loc.label}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-3">
          <input
            type="text"
            placeholder="Nota opcional (ej: coworking, cliente, aeropuerto...)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {todayEntry && (
          <p className="mt-2 text-xs text-gray-500">
            Declarado:{' '}
            <span
              className={`font-medium ${LOC_MAP[todayEntry.location_type as LocationType]?.color}`}
            >
              {LOC_MAP[todayEntry.location_type as LocationType]?.label}
            </span>
            {todayEntry.note && ` — ${todayEntry.note}`}
          </p>
        )}
      </div>

      {/* Team locations */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Equipo — {fmtDate(viewDate)}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewDate(today)}
              className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              disabled={viewDate >= today}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {(teamLocations ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            Nadie ha declarado ubicación este día
          </p>
        ) : (
          <div className="space-y-2">
            {(teamLocations ?? []).map((entry) => {
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
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
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
                  <span className={`text-xs font-medium ${loc?.color}`}>{loc?.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* My history */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Mi historial (30 días)
        </p>
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : (myLocations ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Sin declaraciones anteriores</p>
        ) : (
          <div className="space-y-1.5">
            {(myLocations ?? []).slice(0, 14).map((l) => {
              const loc = LOC_MAP[l.location_type as LocationType]
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-600">{fmtDate(l.date)}</span>
                  <div className="flex items-center gap-2">
                    {l.note && <span className="text-xs text-gray-400">{l.note}</span>}
                    <span className={`text-sm font-medium ${loc?.color}`}>{loc?.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
