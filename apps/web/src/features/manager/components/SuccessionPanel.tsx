'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { GitMerge, Plus, X, Pencil, Trash2 } from 'lucide-react'

const READINESS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  immediate: { label: 'Inmediato', color: 'text-green-700', bg: 'bg-green-100' },
  '1year': { label: '~1 año', color: 'text-blue-700', bg: 'bg-blue-100' },
  '2years': { label: '~2 años', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  developing: { label: 'En desarrollo', color: 'text-gray-600', bg: 'bg-gray-100' },
}

export function SuccessionPanel() {
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [roleTitle, setRoleTitle] = useState('')
  const [incumbentId, setIncumbentId] = useState('')
  const [successorId, setSuccessorId] = useState('')
  const [readiness, setReadiness] = useState<'immediate' | '1year' | '2years' | 'developing'>(
    'developing',
  )
  const [notes, setNotes] = useState('')

  const { data: plans, isLoading } = trpc.manager.getSuccessionPlans.useQuery()
  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )

  const upsert = trpc.manager.upsertSuccessionPlan.useMutation({
    onSuccess: () => {
      utils.manager.getSuccessionPlans.invalidate()
      setShowForm(false)
      resetForm()
    },
  })
  const del = trpc.manager.deleteSuccessionPlan.useMutation({
    onSuccess: () => utils.manager.getSuccessionPlans.invalidate(),
  })

  function resetForm() {
    setEditingId(null)
    setRoleTitle('')
    setIncumbentId('')
    setSuccessorId('')
    setReadiness('developing')
    setNotes('')
  }

  function openEdit(p: any) {
    setEditingId(p.id)
    setRoleTitle(p.role_title)
    setIncumbentId(p.incumbent_id ?? '')
    setSuccessorId(p.successor_id)
    setReadiness(p.readiness)
    setNotes(p.notes ?? '')
    setShowForm(true)
  }

  const planList = (plans ?? []) as any[]
  const memberList = (members ?? []) as any[]

  // Group by role_title for display
  const grouped = planList.reduce((acc: Record<string, any[]>, p: any) => {
    if (!acc[p.role_title]) acc[p.role_title] = []
    acc[p.role_title]!.push(p)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Plan de sucesión</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Quién puede cubrir roles clave en el equipo
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : planList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <GitMerge className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay planes de sucesión registrados</p>
          <p className="mt-1 text-xs text-gray-400">
            Define quién puede asumir cada rol clave si el titular no está disponible
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([role, rolePlans]) => {
            const first = (rolePlans as any[])[0]
            const incumbent = first?.incumbent
            return (
              <div
                key={role}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <div className="bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{role}</p>
                      {incumbent ? (
                        <p className="text-xs text-gray-400">
                          Titular: {incumbent.full_name ?? incumbent.email ?? '—'}
                          {incumbent.position && ` · ${incumbent.position}`}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">Sin titular asignado</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {(rolePlans as any[]).length}{' '}
                      {(rolePlans as any[]).length === 1 ? 'sucesor' : 'sucesores'}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {(rolePlans as any[]).map((p: any) => {
                    const rc = READINESS_CONFIG[p.readiness as string] ?? {
                      label: p.readiness,
                      color: 'text-gray-600',
                      bg: 'bg-gray-100',
                    }
                    const successor = p.successor
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {(successor?.full_name ?? successor?.email ?? '?')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {successor?.full_name ?? successor?.email ?? '—'}
                          </p>
                          {successor?.position && (
                            <p className="text-[10px] text-gray-400">
                              {successor.position}
                              {successor.department && ` · ${successor.department}`}
                            </p>
                          )}
                          {p.notes && <p className="mt-0.5 text-xs text-gray-400">{p.notes}</p>}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${rc.bg} ${rc.color}`}
                        >
                          {rc.label}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="rounded p-1 text-gray-300 hover:text-blue-500"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => del.mutate({ id: p.id })}
                            className="rounded p-1 text-gray-300 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {editingId ? 'Editar sucesor' : 'Nuevo plan de sucesión'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Rol / Puesto clave</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Ej: CTO, Líder de Producto..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Titular actual (opcional)
                </label>
                <select
                  value={incumbentId}
                  onChange={(e) => setIncumbentId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Sin titular / vacante</option>
                  {memberList.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Sucesor potencial</label>
                <select
                  value={successorId}
                  onChange={(e) => setSuccessorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {memberList.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Preparación</label>
                <select
                  value={readiness}
                  onChange={(e) =>
                    setReadiness(e.target.value as 'immediate' | '1year' | '2years' | 'developing')
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  {Object.entries(READINESS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Notas (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!roleTitle.trim() || !successorId || upsert.isPending}
                onClick={() =>
                  upsert.mutate({
                    id: editingId ?? undefined,
                    role_title: roleTitle.trim(),
                    incumbent_id: incumbentId || undefined,
                    successor_id: successorId,
                    readiness,
                    notes: notes || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
