import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { AdminNav } from '@/features/admin/components/AdminNav'
import { NotificationBell } from '@/features/shared/components/NotificationBell'

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

    const tenant = data as { onboarding_complete: boolean } | null
    if (tenant && !tenant.onboarding_complete) redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-end border-b border-gray-200 bg-white px-6">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
