import { RevenueDashboard } from '@/features/platform/components/RevenueDashboard'

export const metadata = { title: 'Revenue — BCWork Super Admin' }

export default function RevenuePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Revenue</h1>
        <p className="mt-1 text-sm text-gray-500">Desglose de ingresos y proyecciones MRR</p>
      </div>
      <RevenueDashboard />
    </div>
  )
}
