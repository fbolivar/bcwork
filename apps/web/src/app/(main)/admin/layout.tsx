import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { AdminNav } from '@/features/admin/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const role = h.get('x-user-role')
  const tenantId = h.get('x-tenant-id')

  if (role !== 'tenant_admin') redirect('/login')

  if (tenantId) {
    const db = getDb()
    const { data } = await db
      .from('tenants')
      .select('onboarding_complete')
      .eq('id', tenantId)
      .single()

    if (data && !data.onboarding_complete) redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  )
}
