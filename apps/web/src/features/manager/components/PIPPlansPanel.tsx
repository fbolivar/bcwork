'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { AlertTriangle, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-yellow-100 text-yellow-700' },
  active: { label: 'Activo', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-500' },
}

export function PIPPlansPanel() {
  const utils = trpc.useUtils()
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [outcomeId, setOutcomeId] = useState<string | null>(null)
  const [outcomeText, setOutcomeText] = useState('')

  const [empId, setEmpId] = useState('')
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [goals, setGoals] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )

  const { data, isLoading } = trpc.manager.getTeamPIPs.useQuery({
    teamId,
    status: filterStatus || undefined,
  })
  const pips = (data ?? []) as any[]

  const create = trpc.manager.createPIP.useMutation({
    onSuccess: () => {
      utils.manager.getTeamPIPs.invalidate()
      setShowCreate(false)
      setEmpId('')
      setTitle('')
      setReason('')
      setGoals('')
      setEndDate('')
    },
  })
  const updateStatus = trpc.manager.updatePIPStatus.useMutation({
    onSuccess: () => utils.manager.getTeamPIPs.invalidate(),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Planes de mejora (PIP)</h2>
          <p className="mt-0.5 text-sm text-gray-500">Seguimiento formal de desempeño</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nuevo PIP
        </button>
      </div>

      <div className="flex gap-1.5">
        {(['', 'draft', 'active', 'completed', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {s === '' ? 'Todos' : (STATUS_CONFIG[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : pips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay planes de mejora registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pips.map((p: any) => {
            const cfg = STATUS_CONFIG[p.status] ?? {
              label: p.status,
              color: 'bg-gray-100 text-gray-500',
            }
            const expanded = expandedId === p.id
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                    {(p.employee_name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{p.title}</p>
                    <p className="text-xs text-gray-400">
                      {p.employee_name} · {p.employee_dept}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {p.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => updateStatus.mutate({ id: p.id, status: 'active' })}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600"
                      >
                        Activar
                      </button>
                    )}
                    {p.status === 'active' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setOutcomeId(p.id)
                            setOutcomeText('')
                          }}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-green-300 hover:text-green-600"
                        >
                          Completar
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus.mutate({ id: p.id, status: 'cancelled' })}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-red-300 hover:text-red-500"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : p.id)}
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
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Inicio: {new Date(p.start_date).toLocaleDateString('es-CO')}</span>
                      {p.end_date && (
                        <span>Fin: {new Date(p.end_date).toLocaleDateString('es-CO')}</span>
                      )}
                    </div>
                    {p.reason && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Motivo:</p>
                        <p className="text-xs text-gray-500">{p.reason}</p>
                      </div>
                    )}
                    {p.goals && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Objetivos:</p>
                        <p className="whitespace-pre-line text-xs text-gray-500">{p.goals}</p>
                      </div>
                    )}
                    {p.outcome_notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Resultado:</p>
                        <p className="text-xs text-gray-500">{p.outcome_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Outcome modal */}
      {outcomeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900">Cerrar PIP</h3>
            <p className="mt-1 text-xs text-gray-400">
              Describe el resultado final del plan de mejora
            </p>
            <textarea
              value={outcomeText}
              onChange={(e) => setOutcomeText(e.target.value)}
              rows={4}
              placeholder="El empleado cumplió los objetivos..."
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOutcomeId(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() => {
                  updateStatus.mutate({
                    id: outcomeId!,
                    status: 'completed',
                    outcome_notes: outcomeText,
                  })
                  setOutcomeId(null)
                }}
                className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Completar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nuevo plan de mejora</h3>
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
                <label className="text-xs font-medium text-gray-700">Empleado</label>
                <select
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {(members ?? []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Título del plan</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Plan de mejora Q2 2026"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Motivo</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Descripción del problema de desempeño..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Objetivos a alcanzar</label>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={3}
                  placeholder="Lista de metas concretas y medibles..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Fecha inicio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Fecha fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
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
                disabled={!empId || !title.trim() || create.isPending}
                onClick={() =>
                  create.mutate({
                    employee_id: empId,
                    title,
                    reason: reason || undefined,
                    goals: goals || undefined,
                    start_date: startDate,
                    end_date: endDate || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear PIP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
