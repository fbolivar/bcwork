import { MetricsSummary } from '@/features/platform/components/MetricsSummary'
import { TenantsAtRisk } from '@/features/platform/components/TenantsAtRisk'

export const metadata = { title: 'Métricas — BCWork Admin' }

export default function MetricsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Métricas de Plataforma</h1>
      <MetricsSummary />
      <TenantsAtRisk />
    </div>
  )
}
