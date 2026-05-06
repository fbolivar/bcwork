'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart2,
  Monitor,
  LogOut,
  User,
  CalendarClock,
  ShieldCheck,
  MonitorDown,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { NotificationBell } from '@/features/shared/components/NotificationBell'

const NAV = [
  { href: '/me/dashboard', label: 'Mi día', icon: LayoutDashboard },
  { href: '/me/metrics', label: 'Mi rendimiento', icon: BarChart2 },
  { href: '/me/sessions', label: 'Mis sesiones', icon: CalendarClock },
  { href: '/me/devices', label: 'Mis dispositivos', icon: Monitor },
  { href: '/me/agent', label: 'Activar agente', icon: MonitorDown },
  { href: '/me/profile', label: 'Mi perfil', icon: User },
  { href: '/me/privacy', label: 'Mi privacidad', icon: ShieldCheck },
]

export function EmployeeNav() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => router.push('/login') })

  return (
    <aside className="flex w-52 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <span className="text-sm font-bold tracking-tight text-blue-600">BCWork</span>
          <p className="mt-0.5 text-xs text-gray-400">Mi espacio</p>
        </div>
        <NotificationBell />
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-blue-50 font-medium text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-gray-100 p-2">
        <button
          type="button"
          onClick={() => logout.mutate({})}
          disabled={logout.isPending}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
