import { UserSearchTable } from '@/features/platform/components/UserSearchTable'

export const metadata = { title: 'Usuarios — BCWork Admin' }

export default function UsersPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Buscar usuarios</h1>
      <UserSearchTable />
    </div>
  )
}
