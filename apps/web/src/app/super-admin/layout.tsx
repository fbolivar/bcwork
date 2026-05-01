import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { SuperAdminNav } from '@/features/platform/components/SuperAdminNav'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const role = headersList.get('x-user-role')

  if (role !== 'platform_admin') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminNav />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </main>
    </div>
  )
}
