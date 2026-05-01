import { MetricsSummary } from '@/features/platform/components/MetricsSummary'

export const metadata = { title: 'Métricas — BCWork Admin' }

export default function MetricsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Métricas de Plataforma</h1>
      <MetricsSummary />
    </div>
  )
}
