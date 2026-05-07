'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Briefcase, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierta', color: 'bg-green-100 text-green-700' },
  interviewing: { label: 'Entrevistando', color: 'bg-blue-100 text-blue-700' },
  filled: { label: 'Cubierta', color: 'bg-purple-100 text-purple-700' },
  draft: { label: 'Borrador', color: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Baja', color: 'bg-gray-100 text-gray-500' },
}

const SENIORITY_LABELS: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  manager: 'Manager',
}

export function HiringRequestsPanel() {
  const utils = trpc.useUtils()
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [description, setDescription] = useState('')
  const [seniority, setSeniority] = useState<'junior' | 'mid' | 'senior' | 'lead' | 'manager'>(
    'mid',
  )
  const [headcount, setHeadcount] = useState(1)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id

  const { data, isLoading } = trpc.manager.getHiringRequests.useQuery({
    status: filterStatus || undefined,
  })
  const requests = (data ?? []) as any[]

  const create = trpc.manager.createHiringRequest.useMutation({
    onSuccess: () => {
      utils.manager.getHiringRequests.invalidate()
      setShowCreate(false)
      setTitle('')
      setDepartment('')
      setDescription('')
      setNotes('')
    },
  })
  const update = trpc.manager.updateHiringRequest.useMutation({
    onSuccess: () => utils.manager.getHiringRequests.invalidate(),
  })

  const openCount = requests.filter(
    (r) => r.status === 'open' || r.status === 'interviewing',
  ).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Solicitudes de contratación</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Posiciones abiertas en el equipo
            {openCount > 0 && (
              <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {openCount} activas
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nueva solicitud
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['', 'open', 'interviewing', 'filled', 'draft', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {s === '' ? 'Todas' : (STATUS_CONFIG[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Briefcase className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Sin solicitudes de contratación</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r: any) => {
            const sCfg = STATUS_CONFIG[r.status] ?? {
              label: r.status,
              color: 'bg-gray-100 text-gray-500',
            }
            const pCfg = PRIORITY_CONFIG[r.priority] ?? {
              label: r.priority,
              color: 'bg-gray-100 text-gray-500',
            }
            const expanded = expandedId === r.id
            return (
              <div
                key={r.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{r.title}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      {r.department && (
                        <span className="text-[10px] text-gray-400">{r.department}</span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {SENIORITY_LABELS[r.seniority_level] ?? r.seniority_level}
                      </span>
                      {r.headcount > 1 && (
                        <span className="text-[10px] text-gray-400">×{r.headcount}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${pCfg.color}`}
                    >
                      {pCfg.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sCfg.color}`}
                    >
                      {sCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => update.mutate({ id: r.id, status: 'interviewing' })}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600"
                      >
                        Entrevistando
                      </button>
                    )}
                    {r.status === 'interviewing' && (
                      <button
                        type="button"
                        onClick={() => update.mutate({ id: r.id, status: 'filled' })}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-green-300 hover:text-green-600"
                      >
                        Cubrir
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : r.id)}
                      className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50"
                    >
                      {expanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="space-y-2 border-t border-gray-50 px-4 py-3 text-sm">
                    {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span>Solicitado por: {r.requester_name || '—'}</span>
                      {r.team_name && <span>Equipo: {r.team_name}</span>}
                      {r.due_date && (
                        <span>
                          Fecha objetivo: {new Date(r.due_date).toLocaleDateString('es-CO')}
                        </span>
                      )}
                      <span>Creado: {new Date(r.created_at).toLocaleDateString('es-CO')}</span>
                    </div>
                    {r.notes && <p className="text-xs italic text-gray-400">{r.notes}</p>}
                    {(r.status === 'open' || r.status === 'interviewing') && (
                      <button
                        type="button"
                        onClick={() => update.mutate({ id: r.id, status: 'cancelled' })}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Cancelar solicitud
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                Nueva solicitud de contratación
              </h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Cargo requerido</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Desarrollador Frontend Senior"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Departamento</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Tecnología"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Senioridad</label>
                  <select
                    value={seniority}
                    onChange={(e) => setSeniority(e.target.value as typeof seniority)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(SENIORITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Vacantes</label>
                  <input
                    type="number"
                    min={1}
                    value={headcount}
                    onChange={(e) => setHeadcount(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Fecha objetivo</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Responsabilidades, requisitos técnicos..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!title.trim() || create.isPending}
                onClick={() =>
                  create.mutate({
                    title,
                    department: department || undefined,
                    description: description || undefined,
                    seniority_level: seniority,
                    headcount,
                    priority,
                    due_date: dueDate || undefined,
                    notes: notes || undefined,
                    teamId,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
