import { RenewalPipeline } from '@/features/platform/components/RenewalPipeline'

export const metadata = { title: 'Renovaciones — BCWork Super Admin' }

export default function RenewalsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pipeline de renovaciones</h1>
        <p className="mt-1 text-sm text-gray-500">
          Licencias próximas a vencer · seguimiento de contacto y negociación
        </p>
      </div>
      <RenewalPipeline />
    </div>
  )
}
