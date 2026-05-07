import { PeopleAnalyticsPanel } from '@/features/admin/components/PeopleAnalyticsPanel'

export const metadata = { title: 'People Analytics — BCWork' }

export default function PeopleAnalyticsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">People Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tendencias de headcount, actividad y rendimiento del equipo
        </p>
      </div>
      <PeopleAnalyticsPanel />
    </div>
  )
}
