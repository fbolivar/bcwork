import { BillingManager } from '@/features/platform/components/BillingManager'

export const metadata = { title: 'Billing — BCWork Admin' }

export default function SuperAdminBillingPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Facturación</h1>
      <p className="mb-6 text-sm text-gray-500">
        Gestiona facturas, confirma pagos y extiende licencias de todos los tenants
      </p>
      <BillingManager />
    </div>
  )
}
