'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  ScrollText,
  LogOut,
  Users,
  BarChart2,
  RefreshCw,
  Rocket,
  Puzzle,
  TrendingUp,
  Mail,
  Zap,
  Megaphone,
  Receipt,
} from 'lucide-react'
import { cn } from '@bcwork/ui'
import { trpc } from '@/lib/trpc-client'

const NAV = [
  { href: '/super-admin/metrics', label: 'Métricas', icon: LayoutDashboard },
  { href: '/super-admin/tenants', label: 'Empresas', icon: Building2 },
  { href: '/super-admin/users', label: 'Usuarios', icon: Users },
  { href: '/super-admin/revenue', label: 'Revenue', icon: BarChart2 },
  { href: '/super-admin/renewals', label: 'Renovaciones', icon: RefreshCw },
  { href: '/super-admin/onboarding', label: 'Onboarding', icon: Rocket },
  { href: '/super-admin/features', label: 'Features', icon: Puzzle },
  { href: '/super-admin/cohorts', label: 'Cohorts', icon: TrendingUp },
  { href: '/super-admin/upsell', label: 'Upsell', icon: Zap },
  { href: '/super-admin/bulk-email', label: 'Email masivo', icon: Mail },
  { href: '/super-admin/announcements', label: 'Anuncios', icon: Megaphone },
  { href: '/super-admin/billing', label: 'Billing', icon: Receipt },
  { href: '/super-admin/plans', label: 'Planes', icon: CreditCard },
  { href: '/super-admin/audit', label: 'Auditoría', icon: ScrollText },
]

export function SuperAdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => router.push('/login'),
  })

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center gap-2.5 border-b border-gray-200 px-4">
        <Image src="/brand/icon.svg" alt="BCWork" width={28} height={28} />
        <span className="text-sm font-bold text-gray-900">BCWork</span>
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
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

      <div className="space-y-2 border-t border-gray-200 p-3">
        <p className="px-1 text-xs text-gray-400">Platform Admin</p>
        <button
          type="button"
          onClick={() => logout.mutate({})}
          disabled={logout.isPending}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
