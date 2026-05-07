import { PayrollPanel } from '@/features/admin/components/PayrollPanel'

export const metadata = { title: 'Nómina — BCWork' }

export default function PayrollPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Motor de Nómina</h1>
        <p className="mt-1 text-sm text-gray-500">
          Períodos, colillas de pago y conceptos colombianos (prima, cesantías, ARL, EPS, pensión)
        </p>
      </div>
      <PayrollPanel />
    </div>
  )
}
