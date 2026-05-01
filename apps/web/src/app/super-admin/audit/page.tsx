import { AuditLogTable } from '@/features/platform/components/AuditLogTable'

export const metadata = { title: 'Auditoría — BCWork Admin' }

export default function AuditPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Registros de Auditoría</h1>
      <AuditLogTable />
    </div>
  )
}
