'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { FileCheck, Clock, CheckCircle2, Package, X } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  income: 'Certificado de ingresos',
  experience: 'Experiencia laboral',
  paz_y_salvo: 'Paz y salvo',
  employment: 'Constancia de empleo',
  other: 'Otro',
}

const STATUS_MAP = {
  pending: { label: 'En proceso', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ready: { label: 'Listo', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  delivered: { label: 'Entregado', color: 'bg-gray-100 text-gray-500', icon: Package },
}

export function CertificatesManager() {
  const utils = trpc.useUtils()
  const [filterStatus, setFilterStatus] = useState<'pending' | 'ready' | 'delivered' | 'all'>('all')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<'pending' | 'ready' | 'delivered'>('ready')
  const [notes, setNotes] = useState('')

  const { data: requests, isLoading } = trpc.admin.listCertificateRequests.useQuery({
    status: filterStatus,
    employee_id: filterEmployee || undefined,
  })
  const { data: usersData } = trpc.admin.listUsers.useQuery({ pageSize: 100 })

  const update = trpc.admin.updateCertificateRequest.useMutation({
    onSuccess: () => {
      utils.admin.listCertificateRequests.invalidate()
      setActiveId(null)
      setNotes('')
    },
  })

  const allRequests = (requests ?? []) as any[]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Certificados laborales</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Gestiona las solicitudes de certificados del equipo
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          title="Filtrar por estado"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">En proceso</option>
          <option value="ready">Listos</option>
          <option value="delivered">Entregados</option>
        </select>
        <select
          title="Filtrar por empleado"
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todos los empleados</option>
          {(usersData?.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <FileCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay solicitudes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allRequests.map((r: any) => {
            const st = STATUS_MAP[r.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.pending
            const StatusIcon = st.icon
            const isActive = activeId === r.id
            return (
              <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {TYPE_LABELS[r.type] ?? r.type}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {r.employee?.full_name ?? '—'} ·{' '}
                      {new Date(r.created_at).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {r.reason && ` · ${r.reason}`}
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {st.label}
                  </span>
                  {r.status !== 'delivered' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(r.id)
                        setNewStatus(r.status === 'pending' ? 'ready' : 'delivered')
                        setNotes(r.notes ?? '')
                      }}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                    >
                      Actualizar
                    </button>
                  )}
                </div>

                {isActive && (
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex gap-2">
                      <select
                        title="Nuevo estado"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as typeof newStatus)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none"
                      >
                        <option value="ready">Listo para recoger</option>
                        <option value="delivered">Entregado</option>
                        <option value="pending">En proceso</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Notas (opcional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveId(null)}
                        className="flex-1 rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({ id: r.id, status: newStatus, notes: notes || undefined })
                        }
                        className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
