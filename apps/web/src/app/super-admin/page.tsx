import { MetricsSummary } from '@/features/platform/components/MetricsSummary'
import { TenantsAtRisk } from '@/features/platform/components/TenantsAtRisk'
import { RecentAuditFeed } from '@/features/platform/components/RecentAuditFeed'
import { QuickLinks } from '@/features/platform/components/QuickLinks'

export const metadata = { title: 'Super Admin — BCWork' }

export default function SuperAdminHome() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Resumen ejecutivo</h1>
        <p className="mt-1 text-sm text-gray-500">Vista general de la plataforma en tiempo real</p>
      </div>
      <MetricsSummary compact />
      <div className="grid gap-6 lg:grid-cols-2">
        <TenantsAtRisk />
        <RecentAuditFeed />
      </div>
      <QuickLinks />
    </div>
  )
}
