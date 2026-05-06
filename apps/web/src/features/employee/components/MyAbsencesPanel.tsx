'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, X, CalendarDays, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const TYPE_LABELS = {
  vacation: 'Vacaciones',
  sick: 'Incapacidad',
  personal: 'Permiso personal',
  other: 'Otro',
}

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  approved: { label: 'Aprobada', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rechazada', cls: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500', icon: X },
}

function businessDays(start: string, end: string): number {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function PTOBalanceCard() {
  const { data } = trpc.employee.getMyPTOBalance.useQuery()
  if (!data) return null
  const vacLeft = Number(data.vacation_days_total) - Number(data.vacation_days_used)
  const sickLeft = Number(data.sick_days_total) - Number(data.sick_days_used)

  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        {
          label: 'Vacaciones disponibles',
          used: Number(data.vacation_days_used),
          total: Number(data.vacation_days_total),
          left: vacLeft,
          colorBorder: 'border-blue-100',
          colorBg: 'bg-blue-50',
          colorText: 'text-blue-700',
          colorSub: 'text-blue-500',
          colorBar: 'bg-blue-400',
          colorLabel: 'text-blue-600',
        },
        {
          label: 'Días de incapacidad',
          used: Number(data.sick_days_used),
          total: Number(data.sick_days_total),
          left: sickLeft,
          colorBorder: 'border-purple-100',
          colorBg: 'bg-purple-50',
          colorText: 'text-purple-700',
          colorSub: 'text-purple-500',
          colorBar: 'bg-purple-400',
          colorLabel: 'text-purple-600',
        },
      ].map((b) => (
        <div key={b.label} className={`rounded-xl border ${b.colorBorder} ${b.colorBg} p-4`}>
          <p className={`text-xs ${b.colorLabel}`}>{b.label}</p>
          <p className={`mt-1 text-3xl font-bold ${b.colorText}`}>{b.left}</p>
          <p className={`text-xs ${b.colorSub}`}>
            de {b.total} días · {b.used} usados
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/60">
            <div
              className={`h-1.5 rounded-full ${b.colorBar}`}
              style={{ width: `${Math.min(100, b.total > 0 ? (b.used / b.total) * 100 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function NewAbsenceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const utils = trpc.useUtils()
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState<'vacation' | 'sick' | 'personal' | 'other'>('vacation')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const days = businessDays(startDate, endDate)

  const request = trpc.employee.requestAbsence.useMutation({
    onSuccess: () => {
      void utils.employee.getMyAbsences.invalidate()
      void utils.employee.getMyPTOBalance.invalidate()
      onSaved()
    },
    onError: (e) => setError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (endDate < startDate) {
      setError('La fecha de fin debe ser igual o posterior al inicio')
      return
    }
    if (days === 0) {
      setError('El rango no incluye días hábiles')
      return
    }
    request.mutate({
      type,
      start_date: startDate,
      end_date: endDate,
      days_count: days,
      reason: reason.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Nueva solicitud de ausencia</h3>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700">Tipo de ausencia</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(Object.entries(TYPE_LABELS) as [keyof typeof TYPE_LABELS, string][]).map(
                ([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setType(k)}
                    className={`rounded-lg border py-2 text-sm font-medium transition-colors ${type === k ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {v}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="abs-start" className="text-xs font-medium text-gray-700">
                Desde
              </label>
              <input
                id="abs-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (e.target.value > endDate) setEndDate(e.target.value)
                }}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="abs-end" className="text-xs font-medium text-gray-700">
                Hasta
              </label>
              <input
                id="abs-end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {days > 0 && (
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <span className="font-semibold">
                {days} día{days !== 1 ? 's' : ''} hábil{days !== 1 ? 'es' : ''}
              </span>{' '}
              seleccionado{days !== 1 ? 's' : ''}
            </div>
          )}
          <div>
            <label htmlFor="abs-reason" className="text-xs font-medium text-gray-700">
              Motivo (opcional)
            </label>
            <textarea
              id="abs-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={request.isPending}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {request.isPending ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function MyAbsencesPanel() {
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>(
    'all',
  )
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.employee.getMyAbsences.useQuery({ status: filter })
  const cancel = trpc.employee.cancelAbsenceRequest.useMutation({
    onSuccess: () => void utils.employee.getMyAbsences.invalidate(),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mis ausencias</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Solicita vacaciones, incapacidades o permisos
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </button>
      </div>

      <PTOBalanceCard />

      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {
              {
                all: 'Todas',
                pending: 'Pendientes',
                approved: 'Aprobadas',
                rejected: 'Rechazadas',
                cancelled: 'Canceladas',
              }[f]
            }
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((req) => {
            const cfg =
              STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
            const Icon = cfg.icon
            return (
              <div key={req.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {TYPE_LABELS[req.type as keyof typeof TYPE_LABELS] ?? req.type}
                      </p>
                      <span className="text-xs text-gray-400">·</span>
                      <p className="text-sm text-gray-600">
                        {req.days_count} día{Number(req.days_count) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {new Date(req.start_date + 'T12:00:00').toLocaleDateString('es-CO')} —{' '}
                      {new Date(req.end_date + 'T12:00:00').toLocaleDateString('es-CO')}
                    </p>
                    {req.reason && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">{req.reason}</p>
                    )}
                    {req.manager_note && (
                      <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        <span className="font-medium">Nota del manager:</span> {req.manager_note}
                      </div>
                    )}
                  </div>
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.cls}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">
                    Creada el {new Date(req.created_at).toLocaleDateString('es-CO')}
                  </p>
                  {req.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => cancel.mutate({ id: req.id })}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Sin solicitudes</p>
          <p className="mt-1 text-xs text-gray-400">Tus solicitudes de ausencia aparecerán aquí</p>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="mt-4 text-sm font-medium text-blue-600 hover:underline"
          >
            Crear primera solicitud
          </button>
        </div>
      )}

      {showNew && (
        <NewAbsenceModal onClose={() => setShowNew(false)} onSaved={() => setShowNew(false)} />
      )}
    </div>
  )
}
