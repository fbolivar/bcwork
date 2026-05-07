'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  CalendarRange,
  Plus,
  X,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAY_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const PRESET_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#64748b',
]

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fmtDisplayDate(d: Date): string {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function fmtTime(t: string): string {
  return t.slice(0, 5)
}

export function ShiftSchedulingPanel() {
  const utils = trpc.useUtils()
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()))
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [editingShift, setEditingShift] = useState<any>(null)
  const [showAssignModal, setShowAssignModal] = useState<{
    userId: string
    dayIndex: number
  } | null>(null)
  const [tab, setTab] = useState<'schedule' | 'shifts'>('schedule')

  // Shift form state
  const [shiftName, setShiftName] = useState('')
  const [shiftDesc, setShiftDesc] = useState('')
  const [shiftStart, setShiftStart] = useState('08:00')
  const [shiftEnd, setShiftEnd] = useState('17:00')
  const [shiftDays, setShiftDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [shiftColor, setShiftColor] = useState('#3b82f6')
  const [selectedShiftId, setSelectedShiftId] = useState('')

  const weekStartStr = fmtDate(weekStart)

  const { data: scheduleData, isLoading } = trpc.manager.getWeekSchedule.useQuery(
    { week_start_date: weekStartStr },
    { keepPreviousData: true } as any,
  )
  const { data: shifts } = trpc.manager.getShifts.useQuery()

  const createShift = trpc.manager.createShift.useMutation({
    onSuccess: () => {
      utils.manager.getShifts.invalidate()
      utils.manager.getWeekSchedule.invalidate()
      resetShiftForm()
      setShowShiftForm(false)
    },
  })
  const updateShift = trpc.manager.updateShift.useMutation({
    onSuccess: () => {
      utils.manager.getShifts.invalidate()
      utils.manager.getWeekSchedule.invalidate()
      resetShiftForm()
      setShowShiftForm(false)
    },
  })
  const deleteShift = trpc.manager.deleteShift.useMutation({
    onSuccess: () => {
      utils.manager.getShifts.invalidate()
      utils.manager.getWeekSchedule.invalidate()
    },
  })
  const assignShift = trpc.manager.assignShift.useMutation({
    onSuccess: () => {
      utils.manager.getWeekSchedule.invalidate()
      setShowAssignModal(null)
    },
  })
  const removeAssignment = trpc.manager.removeShiftAssignment.useMutation({
    onSuccess: () => utils.manager.getWeekSchedule.invalidate(),
  })

  function resetShiftForm() {
    setEditingShift(null)
    setShiftName('')
    setShiftDesc('')
    setShiftStart('08:00')
    setShiftEnd('17:00')
    setShiftDays([1, 2, 3, 4, 5])
    setShiftColor('#3b82f6')
  }

  function openEditShift(s: any) {
    setEditingShift(s)
    setShiftName(s.name)
    setShiftDesc(s.description ?? '')
    setShiftStart(s.start_time.slice(0, 5))
    setShiftEnd(s.end_time.slice(0, 5))
    setShiftDays(s.days_of_week ?? [1, 2, 3, 4, 5])
    setShiftColor(s.color ?? '#3b82f6')
    setShowShiftForm(true)
  }

  function toggleDay(d: number) {
    setShiftDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  function submitShiftForm() {
    if (!shiftName.trim() || shiftDays.length === 0) return
    const payload = {
      name: shiftName.trim(),
      description: shiftDesc || undefined,
      start_time: shiftStart,
      end_time: shiftEnd,
      days_of_week: shiftDays,
      color: shiftColor,
    }
    if (editingShift) {
      updateShift.mutate({ id: editingShift.id, ...payload })
    } else {
      createShift.mutate(payload)
    }
  }

  const members = (scheduleData?.members ?? []) as any[]
  const assignments = (scheduleData?.assignments ?? []) as any[]
  const allShifts = (shifts ?? []) as any[]

  // Build assignment lookup: user_id -> day_of_week -> assignment[]
  const assignMap = new Map<string, Map<number, any[]>>()
  for (const a of assignments) {
    if (!assignMap.has(a.user_id)) assignMap.set(a.user_id, new Map())
    const shift = a.shift
    if (!shift) continue
    const days: number[] = shift.days_of_week ?? []
    for (const d of days) {
      const dm = assignMap.get(a.user_id)!
      if (!dm.has(d)) dm.set(d, [])
      dm.get(d)!.push(a)
    }
  }

  // Week days Mon-Sun (indices 1-0)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return { date, dayOfWeek: date.getDay() }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Turnos y horarios</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Planificación semanal de turnos por empleado
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetShiftForm()
            setShowShiftForm(true)
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nuevo turno
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab('schedule')}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${tab === 'schedule' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Vista semanal
        </button>
        <button
          type="button"
          onClick={() => setTab('shifts')}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${tab === 'shifts' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Turnos definidos ({allShifts.length})
        </button>
      </div>

      {tab === 'schedule' && (
        <>
          {/* Week navigator */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">
                {fmtDisplayDate(weekStart)} — {fmtDisplayDate(addDays(weekStart, 6))}
              </p>
              <p className="text-[10px] text-gray-400">Semana del {weekStartStr}</p>
            </div>
            <button
              type="button"
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <CalendarRange className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No hay miembros en el equipo</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="w-32 px-3 py-2 text-left font-medium text-gray-500">Empleado</th>
                    {weekDays.map(({ date, dayOfWeek }) => (
                      <th
                        key={fmtDate(date)}
                        className={`px-2 py-2 text-center font-medium ${
                          dayOfWeek === 0 || dayOfWeek === 6 ? 'text-gray-300' : 'text-gray-500'
                        }`}
                      >
                        <p>{DAY_LABELS[dayOfWeek]}</p>
                        <p className="text-[10px] text-gray-400">{fmtDisplayDate(date)}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {members.map((m: any) => {
                    const userAssignMap = assignMap.get(m.id)
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                              {(m.full_name ?? m.email ?? '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="max-w-[80px] truncate text-[11px] text-gray-700">
                              {m.full_name ?? m.email}
                            </span>
                          </div>
                        </td>
                        {weekDays.map(({ date, dayOfWeek }) => {
                          const dayAssignments = userAssignMap?.get(dayOfWeek) ?? []
                          return (
                            <td key={fmtDate(date)} className="px-1 py-1.5 text-center">
                              <div className="flex flex-col gap-0.5">
                                {dayAssignments.map((a: any) => (
                                  <div
                                    key={a.id}
                                    className="group relative flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                                    style={{ backgroundColor: a.shift?.color ?? '#3b82f6' }}
                                  >
                                    <span className="max-w-[60px] truncate">{a.shift?.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeAssignment.mutate({ id: a.id })}
                                      className="hidden shrink-0 group-hover:block"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                ))}
                                {allShifts.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowAssignModal({ userId: m.id, dayIndex: dayOfWeek })
                                      setSelectedShiftId(allShifts[0]?.id ?? '')
                                    }}
                                    className="flex h-5 w-full items-center justify-center rounded border border-dashed border-gray-200 text-gray-300 hover:border-blue-300 hover:text-blue-400"
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'shifts' && (
        <div className="space-y-3">
          {allShifts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <Clock className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No hay turnos definidos</p>
              <button
                type="button"
                onClick={() => {
                  resetShiftForm()
                  setShowShiftForm(true)
                }}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                Crear primer turno
              </button>
            </div>
          ) : (
            allShifts.map((s: any) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
              >
                <div
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {fmtTime(s.start_time)} – {fmtTime(s.end_time)} ·{' '}
                    {(s.days_of_week as number[]).map((d) => DAY_LABELS[d]).join(', ')}
                  </p>
                  {s.description && <p className="text-[11px] text-gray-400">{s.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEditShift(s)}
                    className="rounded p-1 text-gray-300 hover:text-blue-500"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteShift.mutate({ id: s.id })}
                    className="rounded p-1 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Shift form modal */}
      {showShiftForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {editingShift ? 'Editar turno' : 'Nuevo turno'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowShiftForm(false)
                  resetShiftForm()
                }}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Nombre del turno</label>
                <input
                  type="text"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="Ej: Turno mañana"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Hora inicio</label>
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Hora fin</label>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Días de la semana</label>
                <div className="mt-1.5 flex gap-1.5">
                  {DAY_LABELS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium transition-colors ${
                        shiftDays.includes(i)
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {d.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Color</label>
                <div className="mt-1.5 flex gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setShiftColor(c)}
                      className={`h-6 w-6 rounded-full transition-transform ${shiftColor === c ? 'scale-125 ring-2 ring-blue-400 ring-offset-1' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Descripción (opcional)</label>
                <input
                  type="text"
                  value={shiftDesc}
                  onChange={(e) => setShiftDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowShiftForm(false)
                  resetShiftForm()
                }}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  !shiftName.trim() ||
                  shiftDays.length === 0 ||
                  createShift.isPending ||
                  updateShift.isPending
                }
                onClick={submitShiftForm}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign shift modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Asignar turno — {DAY_FULL[showAssignModal.dayIndex]}
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(null)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-700">Turno</label>
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
              >
                {allShifts.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({fmtTime(s.start_time)}–{fmtTime(s.end_time)})
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedShiftId || assignShift.isPending}
                onClick={() => {
                  if (!selectedShiftId) return
                  assignShift.mutate({
                    user_id: showAssignModal.userId,
                    shift_id: selectedShiftId,
                    week_start_date: weekStartStr,
                  })
                }}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
