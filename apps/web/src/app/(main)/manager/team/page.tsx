'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { TeamOverview } from '@/features/manager/components/TeamOverview'

export default function TeamPage() {
  const { data: teams, isLoading } = trpc.manager.getMyTeams.useQuery()
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Mi equipo</h1>

      {!isLoading && (teams ?? []).length > 1 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedTeam(undefined)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!selectedTeam ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
          >
            Todos
          </button>
          {(teams ?? []).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTeam(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${selectedTeam === t.id ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600'}`}
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
