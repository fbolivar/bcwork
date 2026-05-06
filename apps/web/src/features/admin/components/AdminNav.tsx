'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Users2,
  Clock,
  AppWindow,
  Network,
  Monitor,
  BarChart2,
  Bell,
  Plug,
  Shield,
  Settings,
  LogOut,
  Download,
  Briefcase,
  Clock4,
  Target,
  MessageSquare,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { useRouter } from 'next/navigation'
import { NotificationBell } from '@/features/shared/components/NotificationBell'

const NAV = [
  { href: '/admin/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/teams', label: 'Equipos', icon: Users2 },
  { href: '/admin/schedules', label: 'Horarios', icon: Clock },
  { href: '/admin/projects', label: 'Proyectos', icon: Briefcase },
  { href: '/admin/overtime', label: 'Horas extra', icon: Clock4 },
  { href: '/admin/goals', label: 'Objetivos', icon: Target },
  { href: '/admin/messages', label: 'Mensajes', icon: MessageSquare },
  { href: '/admin/apps', label: 'Aplicaciones', icon: AppWindow },
  { href: '/admin/ips', label: 'IPs Corporativas', icon: Network },
  { href: '/admin/devices', label: 'Dispositivos', icon: Monitor },
  { href: '/admin/metrics', label: 'Métricas', icon: BarChart2 },
  { href: '/admin/alerts', label: 'Alertas', icon: Bell },
  { href: '/admin/api', label: 'Integraciones', icon: Plug },
  { href: '/admin/audit', label: 'Auditoría', icon: Shield },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
  { href: '/admin/downloads', label: 'Descargas', icon: Download },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => router.push('/login'),
  })

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Image src="/brand/icon.svg" alt="BCWork" width={32} height={32} />
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-800">BCWork</span>
            <p className="text-xs text-gray-400">Panel de administración</p>
          </div>
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
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
