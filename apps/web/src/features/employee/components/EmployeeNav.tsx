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
  Bell,
  X,
  Camera,
  CalendarOff,
  Download,
  CalendarDays,
  ActivitySquare,
  PenLine,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

const NAV = [
  { href: '/me/dashboard', label: 'Mi día', icon: LayoutDashboard },
  { href: '/me/metrics', label: 'Mi rendimiento', icon: BarChart2 },
  { href: '/me/sessions', label: 'Mis sesiones', icon: CalendarClock },
  { href: '/me/activity', label: 'Mi actividad', icon: ActivitySquare },
  { href: '/me/screenshots', label: 'Mis capturas', icon: Camera },
  { href: '/me/schedule', label: 'Mi horario', icon: CalendarDays },
  { href: '/me/absences', label: 'Mis ausencias', icon: CalendarOff },
  { href: '/me/manual-time', label: 'Tiempo manual', icon: PenLine },
  { href: '/me/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/me/devices', label: 'Mis dispositivos', icon: Monitor },
  { href: '/me/agent', label: 'Activar agente', icon: MonitorDown },
  { href: '/me/profile', label: 'Mi perfil', icon: User },
  { href: '/me/privacy', label: 'Mi privacidad', icon: ShieldCheck },
  { href: '/me/export', label: 'Exportar datos', icon: Download },
]

export function EmployeeNav({ onClose }: { onClose?: () => void } = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => router.push('/login') })
  const { data: countData } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  })
  const unread = countData?.count ?? 0

  return (
    <aside className="flex h-full w-52 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <span className="text-sm font-bold tracking-tight text-blue-600">BCWork</span>
          <p className="mt-0.5 text-xs text-gray-400">Mi espacio</p>
        </div>
        {onClose && (
          <button
            type="button"
            title="Cerrar menú"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-blue-50 font-medium text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {href === '/me/notifications' && unread > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
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
