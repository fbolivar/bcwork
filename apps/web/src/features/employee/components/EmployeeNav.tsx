'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart2,
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
  ClipboardList,
  CalendarCheck,
  Heart,
  Briefcase,
  FileText,
  Clock4,
  Target,
  MessageSquare,
  Coffee,
  Users,
  Timer,
  Receipt,
  BarChart3,
  MapPin,
  ClipboardCheck,
  DollarSign,
  Star,
  Wallet,
  Rocket,
  GraduationCap,
  Gift,
  Video,
  FileCheck,
  Megaphone,
  CalendarRange,
  Monitor,
  ChevronDown,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
}

type NavGroup = {
  label: string
  defaultOpen?: boolean
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Inicio',
    defaultOpen: true,
    items: [
      { href: '/me/dashboard', label: 'Mi día', icon: LayoutDashboard },
      { href: '/me/messages', label: 'Mensajes', icon: MessageSquare },
      { href: '/me/notifications', label: 'Notificaciones', icon: Bell },
      { href: '/me/announcements', label: 'Anuncios', icon: Megaphone },
    ],
  },
  {
    label: 'Tiempo y trabajo',
    defaultOpen: false,
    items: [
      { href: '/me/sessions', label: 'Mis sesiones', icon: CalendarClock },
      { href: '/me/activity', label: 'Mi actividad', icon: ActivitySquare },
      { href: '/me/timesheet', label: 'Asistencia', icon: ClipboardList },
      { href: '/me/attendance', label: 'Calendario', icon: CalendarCheck },
      { href: '/me/schedule', label: 'Mi horario', icon: CalendarDays },
      { href: '/me/manual-time', label: 'Tiempo manual', icon: PenLine },
      { href: '/me/breaks', label: 'Mis pausas', icon: Coffee },
      { href: '/me/pomodoro', label: 'Pomodoro', icon: Timer },
      { href: '/me/projects', label: 'Proyectos', icon: Briefcase },
    ],
  },
  {
    label: 'Rendimiento',
    defaultOpen: false,
    items: [
      { href: '/me/metrics', label: 'Mi rendimiento', icon: BarChart2 },
      { href: '/me/goals', label: 'Mis objetivos', icon: Target },
      { href: '/me/performance-reviews', label: 'Evaluaciones', icon: Star },
      { href: '/me/benchmark', label: 'Mi benchmark', icon: BarChart3 },
      { href: '/me/reports', label: 'Mis informes', icon: FileText },
      { href: '/me/screenshots', label: 'Mis capturas', icon: Camera },
    ],
  },
  {
    label: 'Equipo y empresa',
    defaultOpen: false,
    items: [
      { href: '/me/org-chart', label: 'Directorio', icon: Users },
      { href: '/me/team-presence', label: 'Equipo en línea', icon: MapPin },
      { href: '/me/1on1s', label: 'Reuniones 1:1', icon: Video },
      { href: '/me/company-calendar', label: 'Calendario empresa', icon: CalendarRange },
      { href: '/me/kudos', label: 'Reconocimientos', icon: Heart },
      { href: '/me/pulse-surveys', label: 'Encuestas', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Laboral',
    defaultOpen: false,
    items: [
      { href: '/me/absences', label: 'Mis ausencias', icon: CalendarOff },
      { href: '/me/overtime-requests', label: 'Horas extra', icon: Clock4 },
      { href: '/me/payslips', label: 'Mis recibos', icon: DollarSign },
      { href: '/me/expenses', label: 'Mis gastos', icon: Wallet },
      { href: '/me/invoices', label: 'Mis facturas', icon: Receipt },
      { href: '/me/benefits', label: 'Mis beneficios', icon: Gift },
      { href: '/me/hr-documents', label: 'Documentos HR', icon: FileCheck },
      { href: '/me/certificates', label: 'Certificados', icon: FileText },
      { href: '/me/work-location', label: 'Mi ubicación', icon: MapPin },
    ],
  },
  {
    label: 'Crecimiento',
    defaultOpen: false,
    items: [
      { href: '/me/onboarding', label: 'Onboarding', icon: Rocket },
      { href: '/me/training', label: 'Capacitación', icon: GraduationCap },
      { href: '/me/wellness', label: 'Mi bienestar', icon: Heart },
    ],
  },
  {
    label: 'Ajustes',
    defaultOpen: false,
    items: [
      { href: '/me/profile', label: 'Mi perfil', icon: User },
      { href: '/me/devices', label: 'Mis dispositivos', icon: Monitor },
      { href: '/me/agent', label: 'Activar agente', icon: MonitorDown },
      { href: '/me/privacy', label: 'Mi privacidad', icon: ShieldCheck },
      { href: '/me/export', label: 'Exportar datos', icon: Download },
    ],
  },
]

function NavGroupSection({
  group,
  pathname,
  badges,
  onClose,
}: {
  group: NavGroup
  pathname: string
  badges: Record<string, number>
  onClose?: () => void
}) {
  const hasActive = group.items.some((i) => pathname.startsWith(i.href))
  const [open, setOpen] = useState(group.defaultOpen || hasActive)
  const groupBadge = group.items.reduce((sum, i) => sum + (badges[i.href] ?? 0), 0)

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
      >
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {group.label}
        </span>
        {!open && groupBadge > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {groupBadge > 9 ? '9+' : groupBadge}
          </span>
        )}
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-gray-300 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            const badge = badges[href] ?? 0
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-blue-50 font-medium text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-blue-600' : ''}`} />
                <span className="flex-1 truncate">{label}</span>
                {badge > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function EmployeeNav({ onClose }: { onClose?: () => void } = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => router.push('/login') })

  const { data: countData } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  })
  const unread = countData?.count ?? 0

  const { data: msgCountData } = trpc.employee.getMyUnreadMessageCount.useQuery(undefined, {
    refetchInterval: 15000,
  })
  const unreadMsgs = msgCountData?.count ?? 0

  const badges: Record<string, number> = {
    '/me/notifications': unread,
    '/me/messages': unreadMsgs,
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
            B
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-gray-900">BCWork</p>
            <p className="text-[10px] text-gray-400">Mi espacio</p>
          </div>
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            pathname={pathname}
            badges={badges}
            onClose={onClose}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-3">
        <button
          type="button"
          onClick={() => logout.mutate({})}
          disabled={logout.isPending}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
