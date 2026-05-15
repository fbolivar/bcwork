'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { MapPin, Home, Building2, Plane, HelpCircle, Loader2 } from 'lucide-react'

type LocationType = 'home' | 'office' | 'travel' | 'other'

const OPTIONS: {
  value: LocationType
  label: string
  description: string
  icon: React.ElementType
  color: string
  bg: string
}[] = [
  {
    value: 'home',
    label: 'Casa (WFH)',
    description: 'Trabajando desde casa',
    icon: Home,
    color: 'text-blue-600',
    bg: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
  },
  {
    value: 'office',
    label: 'Oficina',
    description: 'En la sede de la empresa',
    icon: Building2,
    color: 'text-green-600',
    bg: 'border-green-200 bg-green-50 hover:bg-green-100',
  },
  {
    value: 'travel',
    label: 'Viaje / Cliente',
    description: 'Desplazamiento o cliente',
    icon: Plane,
    color: 'text-purple-600',
    bg: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
  },
  {
    value: 'other',
    label: 'Otro',
    description: 'Coworking u otra ubicación',
    icon: HelpCircle,
    color: 'text-gray-600',
    bg: 'border-gray-200 bg-gray-50 hover:bg-gray-100',
  },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function WorkLocationGate({ children }: { children: React.ReactNode }) {
  const today = todayStr()
  const [selected, setSelected] = useState<LocationType | null>(null)
  const [note, setNote] = useState('')
  const [declared, setDeclared] = useState(false)

  const { data, isLoading } = trpc.employee.getMyWorkLocations.useQuery(
    { days: 1 },
    { staleTime: 60_000 },
  )

  const declare = trpc.employee.declareWorkLocation.useMutation({
    onSuccess: () => setDeclared(true),
  })

  const todayDeclared =
    declared || (data ?? []).some((r) => (r.date as string).slice(0, 10) === today)

  if (isLoading) return <>{children}</>
  if (todayDeclared) return <>{children}</>

  function submit() {
    if (!selected) return
    declare.mutate({ date: today, location_type: selected, note: note.trim() || undefined })
  }

  return (
    <>
      {children}
      {/* Blocking overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                <MapPin className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">¿Dónde trabajas hoy?</h2>
                <p className="text-xs text-gray-400">
                  {new Date().toLocaleDateString('es-CO', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-2 p-4">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon
              const active = selected === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelected(opt.value)}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    active
                      ? `${opt.bg} border-current ${opt.color} ring-2 ring-offset-1`
                      : `${opt.bg} ${opt.color}`
                  }`}
                >
                  <Icon className="mb-1.5 h-5 w-5" />
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-[11px] opacity-70">{opt.description}</p>
                </button>
              )
            })}
          </div>

          {/* Note */}
          <div className="px-4 pb-4">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota opcional (ej. coworking Selina, cliente Bancolombia)"
              maxLength={200}
              title="Nota opcional"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* CTA */}
          <div className="border-t border-gray-100 px-4 py-3">
            <button
              type="button"
              disabled={!selected || declare.isPending}
              onClick={submit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {declare.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {declare.isPending ? 'Guardando...' : 'Confirmar ubicación'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
