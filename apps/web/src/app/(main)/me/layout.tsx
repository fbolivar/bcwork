import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { EmployeeNav } from '@/features/employee/components/EmployeeNav'

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const role = hdrs.get('x-user-role')

  if (!role || role === 'platform_admin') {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <EmployeeNav />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
