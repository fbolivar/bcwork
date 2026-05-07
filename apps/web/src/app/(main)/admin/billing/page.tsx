import { BillingPanel } from '@/features/admin/components/BillingPanel'

export const metadata = { title: 'Facturación — BCWork Admin' }

export default function BillingPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Plan y facturación</h1>
      <p className="mb-6 text-sm text-gray-500">
        Gestiona tu suscripción, asientos y historial de pagos
      </p>
      <BillingPanel />
    </div>
  )
}
