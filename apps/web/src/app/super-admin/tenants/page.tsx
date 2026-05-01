import { TenantTable } from '@/features/platform/components/TenantTable'

export const metadata = { title: 'Empresas — BCWork Admin' }

export default function TenantsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Empresas</h1>
      <TenantTable />
    </div>
  )
}
