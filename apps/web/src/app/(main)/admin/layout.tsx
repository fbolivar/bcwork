import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { AdminNav } from '@/features/admin/components/AdminNav'
import { NotificationBell } from '@/features/shared/components/NotificationBell'
import { ImpersonationBanner } from '@/features/admin/components/ImpersonationBanner'
import { MaintenanceBanner } from '@/features/admin/components/MaintenanceBanner'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const role = h.get('x-user-role')
  const tenantId = h.get('x-tenant-id')
  const isImpersonating = h.get('x-impersonating') === '1'

  if (role !== 'tenant_admin') redirect('/login')

  let maintenanceMode = false
  let maintenanceMessage: string | null = null

  if (tenantId) {
    const db = getDb()
    const { data } = await db
      .from('tenants')
      .select('onboarding_complete, maintenance_mode, maintenance_message')
      .eq('id', tenantId)
      .single()

    const tenant = data as {
      onboarding_complete: boolean
      maintenance_mode: boolean
      maintenance_message: string | null
    } | null
    if (tenant && !tenant.onboarding_complete) redirect('/onboarding')
    maintenanceMode = tenant?.maintenance_mode ?? false
    maintenanceMessage = tenant?.maintenance_message ?? null
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />
      <div className="flex min-w-0 flex-1 flex-col">
        {isImpersonating && <ImpersonationBanner />}
        {maintenanceMode && !isImpersonating && <MaintenanceBanner message={maintenanceMessage} />}
        <header className="flex h-12 shrink-0 items-center justify-end border-b border-gray-200 bg-white px-6">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
