import { DashboardStats } from '@/features/admin/components/DashboardStats'

export const metadata = { title: 'Dashboard — BCWork Admin' }

export default function DashboardPage() {
  return (
    <div className="pb-6">
      <DashboardStats />
    </div>
  )
}
