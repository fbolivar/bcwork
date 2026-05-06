'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Users, ChevronDown, Save } from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  tenant_admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-600',
}

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Admin',
  manager: 'Manager',
  employee: 'Empleado',
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function OrgChartManager() {
  const utils = trpc.useUtils()
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedManager, setSelectedManager] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: users, isLoading } = trpc.admin.listUsers.useQuery({ pageSize: 200 })
  const updateManager = trpc.admin.updateUserManager.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate()
      setEditId(null)
    },
  })

  function startEdit(userId: string, currentManagerId: string | null) {
    setEditId(userId)
    setSelectedManager(currentManagerId ?? '')
  }

  async function saveManager(userId: string) {
    setSaving(true)
    await updateManager.mutateAsync({ user_id: userId, manager_id: selectedManager || null })
    setSaving(false)
  }

  const allUsers = users?.data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Organigrama del equipo</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Configura la jerarquía de managers y reportes
        </p>
      </div>

      {!isLoading && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Total personas</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">{allUsers.length}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Sin manager</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">
              {allUsers.filter((u: any) => !u.manager_id).length}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allUsers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay personas en el equipo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(allUsers as any[]).map((raw) => {
            type UserRow = {
              id: string
              full_name: string
              email: string
              role: string
              position: string | null
              department: string | null
              manager_id: string | null
            }
            const u = raw as UserRow
            const manager = allUsers.find((m: any) => m.id === u.manager_id)
            const isEditing = editId === u.id
            return (
              <div key={u.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {initials(u.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{u.full_name}</p>
                    <p className="truncate text-xs text-gray-400">
                      {u.position ?? u.department ?? u.email}
                      {manager ? ` · Reporta a: ${(manager as any).full_name}` : ' · Sin manager'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? ROLE_COLORS.employee}`}
                  >
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(u.id, u.manager_id)}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                      Asignar manager
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3 flex gap-2">
                    <select
                      value={selectedManager}
                      onChange={(e) => setSelectedManager(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sin manager (raíz)</option>
                      {(allUsers as any[])
                        .filter((m: any) => m.id !== u.id)
                        .map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name} ({ROLE_LABELS[m.role] ?? m.role})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveManager(u.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Guardar
                    </button>
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
