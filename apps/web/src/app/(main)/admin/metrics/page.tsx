import { MetricsDashboard } from '@/features/admin/components/MetricsDashboard'

export default function MetricsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Métricas y KPIs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Productividad, actividad y tendencias del equipo. Actualización nocturna automática.
        </p>
      </div>
      <MetricsDashboard />
    </div>
  )
}
