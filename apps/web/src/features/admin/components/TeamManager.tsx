'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  Plus,
  Trash2,
  Users2,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  UserPlus,
  Crown,
  Check,
} from 'lucide-react'

// ── TeamCard ──────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  allUsers,
  onDeleted,
}: {
  team: { id: string; name: string; description: string | null; created_at: string }
  allUsers: Array<{ id: string; full_name: string | null; email: string }>
  onDeleted: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(team.name)
  const [editDesc, setEditDesc] = useState(team.description ?? '')
  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<'lead' | 'member'>('member')

  const utils = trpc.useUtils()

  const members = trpc.admin.listTeamMembers.useQuery({ teamId: team.id }, { enabled: expanded })

  const update = trpc.admin.updateTeam.useMutation({
    onSuccess: () => {
      setEditing(false)
      void utils.admin.listTeams.invalidate()
    },
  })

  const remove = trpc.admin.deleteTeam.useMutation({ onSuccess: onDeleted })

  const [addError, setAddError] = useState<string | null>(null)

  const addMember = trpc.admin.addTeamMember.useMutation({
    onSuccess: () => {
      setAddUserId('')
      setAddError(null)
      void utils.admin.listTeamMembers.invalidate({ teamId: team.id })
    },
    onError: (err) => setAddError(err.message),
  })

  const removeMember = trpc.admin.removeTeamMember.useMutation({
    onSuccess: () => void utils.admin.listTeamMembers.invalidate({ teamId: team.id }),
  })

  const memberIds = new Set((members.data ?? []).map((m) => m.user_id))
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id))
  const leadCount = (members.data ?? []).filter((m) => m.role === 'lead').length

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Users2 className="h-5 w-5" />
        </div>

        {editing ? (
          <form
            className="flex flex-1 flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              update.mutate({ id: team.id, name: editName, description: editDesc || undefined })
            }}
          >
            <input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del equipo"
            />
            <input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción (opcional)"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={update.isPending}
                className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setEditName(team.name)
                  setEditDesc(team.description ?? '')
                }}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{team.name}</p>
            {team.description && <p className="text-sm text-gray-400">{team.description}</p>}
            {expanded && members.data && (
              <p className="mt-0.5 text-xs text-gray-400">
                {members.data.length} miembro{members.data.length !== 1 ? 's' : ''} · {leadCount}{' '}
                líder{leadCount !== 1 ? 'es' : ''}
              </p>
            )}
          </div>
        )}

        {!editing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Eliminar equipo "${team.name}" y todos sus miembros?`)) {
                  remove.mutate({ id: team.id })
                }
              }}
              disabled={remove.isPending}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="ml-1 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Expanded: members */}
      {expanded && (
        <div className="space-y-4 border-t border-gray-100 bg-gray-50 px-5 py-4">
          {/* Member list */}
          {members.isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-200" />
              ))}
            </div>
          ) : (members.data ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">Sin miembros aún.</p>
          ) : (
            <div className="space-y-2">
              {(members.data ?? []).map((m) => {
                const u = m.users as unknown as {
                  full_name: string | null
                  email: string
                } | null
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                        {(u?.full_name ?? u?.email ?? '?')[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {u?.full_name ?? u?.email}
                        </p>
                        {u?.full_name && <p className="text-xs text-gray-400">{u.email}</p>}
                      </div>
                      {m.role === 'lead' && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Crown className="h-3 w-3" />
                          Líder
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        title="Rol en el equipo"
                        value={m.role}
                        onChange={(e) =>
                          addMember.mutate({
                            teamId: team.id,
                            userId: m.user_id,
                            role: e.target.value as 'lead' | 'member',
                          })
                        }
                        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:outline-none"
                      >
                        <option value="member">Miembro</option>
                        <option value="lead">Líder</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeMember.mutate({ teamId: team.id, userId: m.user_id })}
                        disabled={removeMember.isPending}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        title="Quitar del equipo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add member form */}
          {availableUsers.length > 0 && (
            <div className="space-y-2">
              {addError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
                  {addError}
                </p>
              )}
              <div className="flex gap-2">
                <select
                  title="Seleccionar usuario"
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar usuario...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name ?? u.email} {u.full_name ? `(${u.email})` : ''}
                    </option>
                  ))}
                </select>
                <select
                  title="Rol del nuevo miembro"
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as 'lead' | 'member')}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Miembro</option>
                  <option value="lead">Líder</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!addUserId) return
                    addMember.mutate({ teamId: team.id, userId: addUserId, role: addRole })
                  }}
                  disabled={!addUserId || addMember.isPending}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  {addMember.isPending ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </div>
          )}
          {availableUsers.length === 0 && !members.isLoading && (
            <p className="text-xs text-gray-400">Todos los usuarios activos ya son miembros.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── TeamManager ───────────────────────────────────────────────────────────────

export function TeamManager() {
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')

  const utils = trpc.useUtils()
  const teams = trpc.admin.listTeams.useQuery({ page: 1, pageSize: 50 })
  const allUsers = trpc.admin.listUsers.useQuery({ pageSize: 100, status: 'active' })

  const create = trpc.admin.createTeam.useMutation({
    onSuccess: () => {
      setCreateName('')
      setCreateDesc('')
      setCreating(false)
      void utils.admin.listTeams.invalidate()
    },
  })

  const usersForAssignment = (allUsers.data?.data ?? []).map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
  }))

  const teamList = teams.data?.data ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {teamList.length} equipo{teamList.length !== 1 ? 's' : ''} configurado
            {teamList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo equipo
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <form
          className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({ name: createName, ...(createDesc ? { description: createDesc } : {}) })
          }}
        >
          <h3 className="text-sm font-semibold text-blue-800">Nuevo equipo</h3>
          <input
            required
            placeholder="Nombre del equipo *"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            placeholder="Descripción (opcional)"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {create.error && <p className="text-sm text-red-600">{create.error.message}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {create.isPending ? 'Creando...' : 'Crear equipo'}
            </button>
          </div>
        </form>
      )}

      {/* Loading */}
      {teams.isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!teams.isLoading && teamList.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <Users2 className="mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-400">Sin equipos configurados</p>
          <p className="mt-1 text-sm text-gray-400">Crea el primero con el botón de arriba.</p>
        </div>
      )}

      {/* Team list */}
      <div className="space-y-3">
        {teamList.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            allUsers={usersForAssignment}
            onDeleted={() => utils.admin.listTeams.invalidate()}
          />
        ))}
      </div>
    </div>
  )
}
