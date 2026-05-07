import { CompliancePanel } from '@/features/admin/components/CompliancePanel'

export const metadata = { title: 'Cumplimiento Normativo — BCWork' }

export default function CompliancePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Cumplimiento Normativo</h1>
        <p className="mt-1 text-sm text-gray-500">
          SGSST, ARL, EPS, pensión y demás requerimientos legales colombianos
        </p>
      </div>
      <CompliancePanel />
    </div>
  )
}
