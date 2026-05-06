import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ManagerShell } from '@/features/manager/components/ManagerShell'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const role = hdrs.get('x-user-role')

  if (role !== 'manager' && role !== 'tenant_admin') {
    redirect('/login')
  }

  return <ManagerShell>{children}</ManagerShell>
}
