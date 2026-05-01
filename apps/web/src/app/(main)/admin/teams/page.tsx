import { TeamManager } from '@/features/admin/components/TeamManager'

export const metadata = { title: 'Equipos — BCWork Admin' }

export default function TeamsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Equipos</h1>
      <TeamManager />
    </div>
  )
}
