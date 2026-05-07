import { ReportBuilderPanel } from '@/features/admin/components/ReportBuilderPanel'

export const metadata = { title: 'Constructor de Informes — BCWork' }

export default function ReportBuilderPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Constructor de Informes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Genera y exporta reportes personalizados de asistencia, productividad, ausencias y nómina
        </p>
      </div>
      <ReportBuilderPanel />
    </div>
  )
}
