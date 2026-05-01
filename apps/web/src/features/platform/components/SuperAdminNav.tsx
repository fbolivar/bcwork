'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, CreditCard, ScrollText, Settings } from 'lucide-react'
import { cn } from '@bcwork/ui'

const NAV = [
  { href: '/super-admin/metrics', label: 'Métricas', icon: LayoutDashboard },
  { href: '/super-admin/tenants', label: 'Empresas', icon: Building2 },
  { href: '/super-admin/plans', label: 'Planes', icon: CreditCard },
  { href: '/super-admin/audit', label: 'Auditoría', icon: ScrollText },
]

export function SuperAdminNav() {
  const pathname = usePathname()

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <span className="text-sm font-bold text-gray-900">BCWork</span>
        <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <p className="text-xs text-gray-400">Platform Admin</p>
      </div>
    </aside>
  )
}
