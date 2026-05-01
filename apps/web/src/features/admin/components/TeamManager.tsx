'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { formatDate } from '@/lib/format'
import { Plus, Trash2, Users2 } from 'lucide-react'

export function TeamManager() {
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.admin.listTeams.useQuery({ page: 1, pageSize: 50 })
  const create = trpc.admin.createTeam.useMutation({
    onSuccess: () => {
      setNewName('')
      setNewDesc('')
      setCreating(false)
      void utils.admin.listTeams.invalidate()
    },
  })
  const remove = trpc.admin.deleteTeam.useMutation({
    onSuccess: () => utils.admin.listTeams.invalidate(),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo equipo
        </button>
      </div>

      {creating && (
        <form
          className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({
              name: newName,
              ...(newDesc ? { description: newDesc } : {}),
            })
          }}
        >
          <h3 className="text-sm font-semibold text-blue-800">Nuevo equipo</h3>
          <input
            type="text"
            required
            placeholder="Nombre del equipo"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Descripción (opcional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {create.error && <p className="text-sm text-red-600">{create.error.message}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {create.isPending ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && (data?.data ?? []).length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12">
          <Users2 className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Sin equipos. Crea el primero.</p>
        </div>
      )}

      <div className="space-y-2">
        {(data?.data ?? []).map((team) => (
          <div
            key={team.id}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4"
          >
            <div>
              <p className="font-medium text-gray-900">{team.name}</p>
              {team.description && <p className="text-sm text-gray-400">{team.description}</p>}
              <p className="mt-0.5 text-xs text-gray-400">Creado {formatDate(team.created_at)}</p>
            </div>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar equipo "${team.name}"?`)) {
                  remove.mutate({ id: team.id })
                }
              }}
              disabled={remove.isPending}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
