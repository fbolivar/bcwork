import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ManagerNav } from '@/features/manager/components/ManagerNav'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const role = hdrs.get('x-user-role')

  if (role !== 'manager' && role !== 'tenant_admin') {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <ManagerNav />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
