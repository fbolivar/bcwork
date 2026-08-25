import { AgentUpdatesManager } from '@/features/admin/components/AgentUpdatesManager'

export const metadata = { title: 'Actualizaciones del agente — BCWork Admin' }

export default function AgentUpdatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Actualizaciones del agente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Los equipos se actualizan automáticamente. Aquí ves la versión publicada y qué equipos ya
          la tienen.
        </p>
      </div>
      <AgentUpdatesManager />
    </div>
  )
}
