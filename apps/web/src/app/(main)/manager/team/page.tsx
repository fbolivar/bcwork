'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { TeamOverview } from '@/features/manager/components/TeamOverview'
import { Users2 } from 'lucide-react'

export default function TeamPage() {
  const { data: teams, isLoading } = trpc.manager.getMyTeams.useQuery()
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  const teamList = teams ?? []

  if (teamList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20">
        <Users2 className="mb-3 h-10 w-10 text-gray-300" />
        <p className="font-medium text-gray-500">Sin equipos asignados</p>
        <p className="mt-1 text-sm text-gray-400">
          Pide al administrador que te agregue a un equipo.
        </p>
      </div>
    )
  }

  const activeTeam = selectedTeam ? teamList.find((t) => t.id === selectedTeam) : undefined

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {activeTeam ? activeTeam.name : 'Todos los equipos'}
        </h1>
        {activeTeam?.description && (
          <p className="mt-0.5 text-sm text-gray-500">{activeTeam.description}</p>
        )}
      </div>

      {/* Team selector — only shown when more than one team */}
      {teamList.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedTeam(undefined)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !selectedTeam
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          {teamList.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTeam(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedTeam === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <TeamOverview {...(selectedTeam ? { teamId: selectedTeam } : {})} />
    </div>
  )
}
