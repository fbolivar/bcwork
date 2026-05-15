import { CohortTable } from '@/features/platform/components/CohortTable'

export const metadata = { title: 'Cohort Analysis — BCWork Super Admin' }

export default function CohortsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cohort Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Retención de tenants por mes de adquisición — mide el LTV real y el churn estructural
        </p>
      </div>
      <CohortTable />
    </div>
  )
}
