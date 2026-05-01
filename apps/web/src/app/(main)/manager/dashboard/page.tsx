'use client'

import { trpc } from '@/lib/trpc-client'
import { TeamOverview } from '@/features/manager/components/TeamOverview'
import { ActiveSessionsPanel } from '@/features/manager/components/ActiveSessionsPanel'

export default function ManagerDashboard() {
  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const firstTeam = teams?.[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Panel de Manager</h1>
        <p className="mt-1 text-sm text-gray-500">
          {firstTeam ? `Equipo: ${firstTeam.name}` : 'Vista general de todos los equipos'}
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Sesiones activas ahora</h2>
        <ActiveSessionsPanel teamId={firstTeam?.id} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Rendimiento del equipo</h2>
        <TeamOverview teamId={firstTeam?.id} />
      </section>
    </div>
  )
}
