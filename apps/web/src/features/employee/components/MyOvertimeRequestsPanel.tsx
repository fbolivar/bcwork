'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, X, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  approved: { label: 'Aprobada', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rechazada', cls: 'bg-red-100 text-red-700', icon: XCircle },
}

const TYPE_LABELS = {
  payment: 'Pago económico',
  compensation: 'Descanso compensatorio',
}

function NewOvertimeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const utils = trpc.useUtils()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [hours, setHours] = useState(1)
  const [mins, setMins] = useState(0)
  const [type, setType] = useState<'payment' | 'compensation'>('payment')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const request = trpc.employee.requestOvertime.useMutation({
    onSuccess: () => {
      void utils.employee.getMyOvertimeRequests.invalidate()
      onSaved()
    },
    onError: (e) => setError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const secs = hours * 3600 + mins * 60
    if (secs < 60) {
      setError('Ingresa al menos 1 minuto de horas extra')
      return
    }
    if (reason.trim().length < 5) {
      setError('La razón debe tener al menos 5 caracteres')
      return
    }
    request.mutate({ date, overtime_seconds: secs, type, reason: reason.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Nueva solicitud de horas extra</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700">Fecha</label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Horas extra realizadas</label>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-16 rounded-lg border border-gray-200 px-2 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">h</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={15}
                  value={mins}
                  onChange={(e) => setMins(Number(e.target.value))}
                  className="w-16 rounded-lg border border-gray-200 px-2 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">min</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Tipo de compensación</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(['payment', 'compensation'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">
              Motivo / descripción del trabajo realizado
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Describe el trabajo realizado fuera del horario habitual…"
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

export function MyOvertimeRequestsPanel() {
  const [showNew, setShowNew] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const { data, isLoading } = trpc.employee.getMyOvertimeRequests.useQuery({ status: filter })

  const totalApproved = (data ?? [])
    .filter((r) => r.status === 'approved')
    .reduce((s, r) => s + r.overtime_seconds, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Solicitudes de horas extra</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Solicita reconocimiento formal de tus horas adicionales
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

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <div className="text-sm text-blue-700">
          <p className="font-semibold">Ley 2121 de 2021 — Tu derecho a la compensación</p>
          <p className="mt-0.5 text-xs">
            Las horas extra deben ser reconocidas como pago adicional o como tiempo compensatorio.
            Máximo 50h/mes. Si tu solicitud es aprobada, tu empleador tiene la obligación de
            compensarte.
          </p>
        </div>
      </div>

      {/* Stats */}
      {totalApproved > 0 && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
            <p className="text-xs text-green-600">Total aprobadas</p>
            <p className="mt-0.5 text-2xl font-bold text-green-700">{fmtHours(totalApproved)}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
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
              }[f]
            }
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
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
                      <p className="font-medium text-gray-900">{req.date}</p>
                      <span className="text-xs text-gray-400">·</span>
                      <p className="text-sm text-gray-600">
                        {TYPE_LABELS[req.type as keyof typeof TYPE_LABELS]}
                      </p>
                    </div>
                    <p className="mt-1 text-xl font-bold tabular-nums text-gray-800">
                      {fmtHours(req.overtime_seconds)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">{req.reason}</p>
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
                <p className="mt-2 text-[11px] text-gray-400">
                  Creada el {new Date(req.created_at).toLocaleDateString('es-CO')}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Clock className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Sin solicitudes</p>
          <p className="mt-1 text-xs text-gray-400">
            Tus solicitudes de horas extra aparecerán aquí
          </p>
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
        <NewOvertimeModal onClose={() => setShowNew(false)} onSaved={() => setShowNew(false)} />
      )}
    </div>
  )
}
