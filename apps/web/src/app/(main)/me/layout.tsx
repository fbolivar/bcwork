import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { EmployeeNav } from '@/features/employee/components/EmployeeNav'
import { getDb } from '@/lib/db'

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const role = hdrs.get('x-user-role')
  const userId = hdrs.get('x-user-id')
  const tenantId = hdrs.get('x-tenant-id')

  if (!role || role === 'platform_admin') {
    redirect('/login')
  }

  if (role === 'employee' && userId && tenantId) {
    const db = getDb()
    const { data } = await db
      .from('consents')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('consent_type', 'monitoring_basic')
      .eq('granted', true)
      .is('revoked_at', null)
      .maybeSingle()

    if (!data) {
      redirect('/consent')
    }
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
