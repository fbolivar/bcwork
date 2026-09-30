import { UserTable } from '@/features/admin/components/UserTable'
import { DepartmentManager } from '@/features/admin/components/DepartmentManager'

export const metadata = { title: 'Usuarios — BCWork Admin' }

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>
      <UserTable />
      <DepartmentManager />
    </div>
  )
}
