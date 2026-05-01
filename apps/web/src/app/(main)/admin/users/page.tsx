import { UserTable } from '@/features/admin/components/UserTable'

export const metadata = { title: 'Usuarios — BCWork Admin' }

export default function UsersPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Usuarios</h1>
      <UserTable />
    </div>
  )
}
