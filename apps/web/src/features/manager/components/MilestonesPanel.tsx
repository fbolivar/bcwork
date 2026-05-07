'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Gift, Cake, CalendarHeart, Pencil, Check, X } from 'lucide-react'

function daysUntil(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000)
  return diff
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
  })
}

export function MilestonesPanel() {
  const utils = trpc.useUtils()
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [hireDate, setHireDate] = useState('')
  const [birthdate, setBirthdate] = useState('')

  const { data, isLoading } = trpc.manager.getTeamMilestones.useQuery({ months_ahead: 3 })
  const milestones = (data?.milestones ?? []) as any[]
  const employees = (data?.employees ?? []) as any[]

  const update = trpc.manager.updateUserMilestoneData.useMutation({
    onSuccess: () => {
      utils.manager.getTeamMilestones.invalidate()
      setEditingUser(null)
    },
  })

  function startEdit(emp: any) {
    setEditingUser(emp.id)
    setHireDate(emp.hire_date ?? '')
    setBirthdate(emp.birthdate ?? '')
  }

  const today = milestones.filter((m) => daysUntil(m.date) === 0)
  const upcoming7 = milestones.filter((m) => {
    const d = daysUntil(m.date)
    return d > 0 && d <= 7
  })
  const upcoming = milestones.filter((m) => daysUntil(m.date) > 7)

  function MilestoneRow({ m }: { m: any }) {
    const days = daysUntil(m.date)
    const isAnniv = m.type === 'anniversary'
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${days === 0 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100 bg-white'}`}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isAnniv ? 'bg-purple-100' : 'bg-pink-100'}`}
        >
          {isAnniv ? (
            <CalendarHeart className="h-4 w-4 text-purple-600" />
          ) : (
            <Cake className="h-4 w-4 text-pink-600" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{m.name}</p>
          <p className="text-xs text-gray-400">
            {isAnniv ? `${m.years} año${m.years !== 1 ? 's' : ''} en la empresa` : 'Cumpleaños'} ·{' '}
            {fmtDate(m.date)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${days === 0 ? 'bg-yellow-200 text-yellow-800' : days <= 7 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}
        >
          {days === 0 ? '¡Hoy!' : `En ${days} días`}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Aniversarios y hitos</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Próximos cumpleaños y aniversarios del equipo
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Upcoming milestones */}
          <div className="space-y-4 lg:col-span-2">
            {today.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-yellow-700">
                  <Gift className="h-3.5 w-3.5" /> HOY
                </p>
                {today.map((m, i) => (
                  <MilestoneRow key={i} m={m} />
                ))}
              </div>
            )}
            {upcoming7.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Próximos 7 días
                </p>
                {upcoming7.map((m, i) => (
                  <MilestoneRow key={i} m={m} />
                ))}
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Próximos 3 meses
                </p>
                {upcoming.map((m, i) => (
                  <MilestoneRow key={i} m={m} />
                ))}
              </div>
            )}
            {milestones.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
                <CalendarHeart className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">Sin hitos en los próximos 3 meses</p>
                <p className="mt-1 text-xs text-gray-400">
                  Registra fechas de ingreso y cumpleaños en la columna derecha
                </p>
              </div>
            )}
          </div>

          {/* Employee dates editor */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Datos del equipo
            </p>
            {employees.map((emp: any) => {
              const isEditing = editingUser === emp.id
              return (
                <div
                  key={emp.id}
                  className="rounded-xl border border-gray-100 bg-white px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-700">
                      {emp.full_name ?? emp.email}
                    </p>
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => startEdit(emp)}
                        className="rounded p-1 text-gray-300 hover:text-blue-500"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            update.mutate({
                              user_id: emp.id,
                              hire_date: hireDate || undefined,
                              birthdate: birthdate || undefined,
                            })
                          }
                          className="rounded p-1 text-green-500 hover:text-green-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUser(null)}
                          className="rounded p-1 text-gray-300 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-1.5 space-y-1.5">
                      <div>
                        <label className="text-[10px] text-gray-400">Fecha ingreso</label>
                        <input
                          type="date"
                          value={hireDate}
                          onChange={(e) => setHireDate(e.target.value)}
                          className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400">Cumpleaños</label>
                        <input
                          type="date"
                          value={birthdate}
                          onChange={(e) => setBirthdate(e.target.value)}
                          className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex gap-3 text-[10px] text-gray-400">
                      <span>
                        {emp.hire_date
                          ? `Ingresó: ${new Date(emp.hire_date).getFullYear()}`
                          : 'Sin fecha ingreso'}
                      </span>
                      <span>{emp.birthdate ? '🎂 Registrado' : 'Sin cumpleaños'}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
