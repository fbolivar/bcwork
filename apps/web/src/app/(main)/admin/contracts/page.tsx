import { ContractsPanel } from '@/features/admin/components/ContractsPanel'

export const metadata = { title: 'Contratos — BCWork' }

export default function ContractsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Gestión de Contratos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Contratos laborales, tipos colombianos, seguimiento de firma y estado
        </p>
      </div>
      <ContractsPanel />
    </div>
  )
}
