'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users2,
  Activity,
  LogOut,
  BellRing,
  ClipboardEdit,
  X,
  Clock4,
  Target,
  Video,
  MessageSquare,
  ClipboardList,
  FileText,
  Wallet,
  ChevronDown,
  CalendarOff,
  TrendingUp,
  ClipboardCheck,
  CalendarDays,
  Bell,
  Heart,
  BarChart2,
  BookOpen,
  GitCompare,
  Star,
  DollarSign,
  Layers,
  UserCheck,
  Gauge,
  AlertTriangle,
  Network,
  CalendarHeart,
  Briefcase,
  Smile,
  GitMerge,
  CalendarCheck,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { NotificationBell } from '@/features/shared/components/NotificationBell'

type NavItem = { href: string; label: string; icon: React.ElementType }
type NavGroup = { label: string; defaultOpen?: boolean; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'General',
    defaultOpen: true,
    items: [
      { href: '/manager/dashboard', label: 'Resumen', icon: LayoutDashboard },
      { href: '/manager/team', label: 'Mi equipo', icon: Users2 },
      { href: '/manager/sessions', label: 'Sesiones activas', icon: Activity },
      { href: '/manager/messages', label: 'Mensajes', icon: MessageSquare },
      { href: '/manager/notifications', label: 'Notificaciones', icon: BellRing },
    ],
  },
  {
    label: 'Aprobaciones',
    defaultOpen: false,
    items: [
      { href: '/manager/corrections', label: 'Correcciones', icon: ClipboardEdit },
      { href: '/manager/overtime', label: 'Horas extra', icon: Clock4 },
      { href: '/manager/expenses', label: 'Gastos', icon: Wallet },
      { href: '/manager/leave', label: 'Ausencias', icon: CalendarOff },
    ],
  },
  {
    label: 'Gestión de personas',
    defaultOpen: false,
    items: [
      { href: '/manager/goals', label: 'Objetivos', icon: Target },
      { href: '/manager/1on1s', label: 'Reuniones 1:1', icon: Video },
      { href: '/manager/reviews', label: 'Evaluaciones', icon: ClipboardCheck },
      { href: '/manager/kudos', label: 'Reconocimientos', icon: Heart },
      { href: '/manager/pulse', label: 'Encuestas de pulso', icon: BarChart2 },
      { href: '/manager/training', label: 'Capacitaciones', icon: BookOpen },
      { href: '/manager/feedback360', label: 'Feedback 360°', icon: Star },
      { href: '/manager/pip', label: 'Planes de mejora', icon: AlertTriangle },
      { href: '/manager/onboarding', label: 'Onboarding', icon: UserCheck },
      { href: '/manager/milestones', label: 'Aniversarios', icon: CalendarHeart },
      { href: '/manager/enps', label: 'eNPS', icon: Smile },
      { href: '/manager/succession', label: 'Plan de sucesión', icon: GitMerge },
    ],
  },
  {
    label: 'Equipo',
    defaultOpen: false,
    items: [
      { href: '/manager/orgchart', label: 'Organigrama', icon: Network },
      { href: '/manager/skills', label: 'Competencias', icon: Layers },
      { href: '/manager/workload', label: 'Carga de trabajo', icon: Gauge },
      { href: '/manager/compensation', label: 'Compensación', icon: DollarSign },
      { href: '/manager/hiring', label: 'Contrataciones', icon: Briefcase },
      { href: '/manager/leave-balances', label: 'Saldos de ausencias', icon: CalendarCheck },
    ],
  },
  {
    label: 'Reportes y análisis',
    defaultOpen: false,
    items: [
      { href: '/manager/timesheet', label: 'Timesheet', icon: ClipboardList },
      { href: '/manager/reports', label: 'Informes', icon: FileText },
      { href: '/manager/trends', label: 'Tendencias', icon: TrendingUp },
      { href: '/manager/calendar', label: 'Calendario', icon: CalendarDays },
      { href: '/manager/comparison', label: 'Comparativa', icon: GitCompare },
      { href: '/manager/budget', label: 'Presupuesto', icon: Wallet },
    ],
  },
  {
    label: 'Configuración',
    defaultOpen: false,
    items: [{ href: '/manager/alerts', label: 'Alertas', icon: Bell }],
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

export function ManagerNav({ onClose }: { onClose?: () => void } = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => router.push('/login') })

  const { data: pendingCorrections } = trpc.manager.getPendingCorrectionsCount.useQuery()
  const { data: pendingOvertime } = trpc.manager.getPendingOvertimeCount.useQuery()
  const { data: pendingExpenses } = trpc.manager.getPendingExpensesCount.useQuery()
  const { data: pendingLeave } = trpc.manager.getPendingLeaveCount.useQuery()
  const { data: unreadMsgs } = trpc.manager.getUnreadMessageCount.useQuery(undefined, {
    refetchInterval: 15000,
  })

  const badges: Record<string, number> = {
    '/manager/corrections': pendingCorrections?.count ?? 0,
    '/manager/overtime': pendingOvertime?.count ?? 0,
    '/manager/expenses': pendingExpenses?.count ?? 0,
    '/manager/leave': typeof pendingLeave === 'number' ? pendingLeave : 0,
    '/manager/messages': unreadMsgs?.count ?? 0,
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-100 bg-white">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
            B
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-gray-900">BCWork</p>
            <p className="text-[10px] text-gray-400">Panel manager</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
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
      </div>

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
