'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CheckCircle, XCircle, AlertCircle, X, CalendarDays } from 'lucide-react'

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

type AbsenceRequest = {
  id: string
  type: string
  start_date: string
  end_date: string
  days_count: number
  reason: string | null
  status: string
  created_at: string
  users: {
    id: string
    full_name: string | null
    email: string
    department: string | null
    position: string | null
  } | null
}

function ReviewModal({ req, onClose }: { req: AbsenceRequest; onClose: () => void }) {
  const utils = trpc.useUtils()
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [note, setNote] = useState('')

  const update = trpc.admin.updateAbsenceRequest.useMutation({
    onSuccess: () => {
      void utils.admin.getAbsenceRequests.invalidate()
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Revisar solicitud</h3>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <p className="font-medium text-gray-900">
            {req.users?.full_name ?? req.users?.email ?? 'Empleado'}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {TYPE_LABELS[req.type as keyof typeof TYPE_LABELS] ?? req.type} · {req.days_count} día
            {Number(req.days_count) !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-gray-500">
            {new Date(req.start_date + 'T12:00:00').toLocaleDateString('es-CO')} —{' '}
            {new Date(req.end_date + 'T12:00:00').toLocaleDateString('es-CO')}
          </p>
          {req.reason && <p className="mt-2 text-sm text-gray-500">{req.reason}</p>}
        </div>
        <div className="mt-4">
          <label className="text-xs font-medium text-gray-700">Decisión</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(['approved', 'rejected'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecision(d)}
                className={`rounded-lg border py-2 text-sm font-medium transition-colors ${decision === d ? (d === 'approved' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {d === 'approved' ? 'Aprobar' : 'Rechazar'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <label htmlFor="rev-note" className="text-xs font-medium text-gray-700">
            Nota para el empleado (opcional)
          </label>
          <textarea
            id="rev-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                id: req.id,
                status: decision,
                manager_note: note.trim() || undefined,
              })
            }
            className={`flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50 ${decision === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {update.isPending ? 'Guardando…' : decision === 'approved' ? 'Aprobar' : 'Rechazar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AbsenceRequestsManager() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>(
    'pending',
  )
  const [reviewing, setReviewing] = useState<AbsenceRequest | null>(null)

  const { data, isLoading } = trpc.admin.getAbsenceRequests.useQuery({ status: filter })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Solicitudes de ausencia</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Aprueba o rechaza las solicitudes de tu equipo
        </p>
      </div>

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
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((req) => {
            const r = req as unknown as AbsenceRequest
            const cfg =
              STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
            const Icon = cfg.icon
            return (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {r.users?.full_name ?? r.users?.email ?? 'Empleado'}
                      </p>
                      {r.users?.position && (
                        <span className="text-xs text-gray-400">· {r.users.position}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600">
                      {TYPE_LABELS[r.type as keyof typeof TYPE_LABELS] ?? r.type} · {r.days_count}{' '}
                      día{Number(r.days_count) !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(r.start_date + 'T12:00:00').toLocaleDateString('es-CO')} —{' '}
                      {new Date(r.end_date + 'T12:00:00').toLocaleDateString('es-CO')}
                    </p>
                    {r.reason && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-400">{r.reason}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.cls}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => setReviewing(r)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Revisar
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  Creada el {new Date(r.created_at).toLocaleDateString('es-CO')}
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">
            Sin solicitudes {filter !== 'all' ? 'en este estado' : ''}
          </p>
        </div>
      )}

      {reviewing && <ReviewModal req={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  )
}
