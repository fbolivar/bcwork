import { DashboardStats } from '@/features/admin/components/DashboardStats'

export const metadata = { title: 'Dashboard — BCWork Admin' }

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Resumen</h1>
      <DashboardStats />
    </div>
  )
}
