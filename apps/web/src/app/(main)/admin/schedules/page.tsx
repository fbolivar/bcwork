import { ScheduleManager } from '@/features/admin/components/ScheduleManager'

export const metadata = { title: 'Horarios — BCWork Admin' }

export default function SchedulesPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Horarios laborales</h1>
      <ScheduleManager />
    </div>
  )
}
