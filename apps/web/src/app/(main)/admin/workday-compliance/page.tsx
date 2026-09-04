import { ComplianceReportPanel } from '@/features/admin/components/ComplianceReportPanel'

export default function WorkdayCompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Cumplimiento de jornada</h1>
        <p className="mt-1 text-sm text-gray-500">
          Lo trabajado frente a lo pactado, con comparación contra el período anterior. Exportable
          en PDF con los datos de la empresa.
        </p>
      </div>
      <ComplianceReportPanel />
    </div>
  )
}
