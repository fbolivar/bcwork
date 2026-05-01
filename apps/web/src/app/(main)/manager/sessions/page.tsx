'use client'

import { trpc } from '@/lib/trpc-client'
import { ActiveSessionsPanel } from '@/features/manager/components/ActiveSessionsPanel'

export default function SessionsPage() {
  const { data: teams } = trpc.manager.getMyTeams.useQuery()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Sesiones activas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Colaboradores conectados en este momento. Se actualiza cada 30 segundos.
        </p>
      </div>
      <ActiveSessionsPanel teamId={teams?.[0]?.id} />
    </div>
  )
}
