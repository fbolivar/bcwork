'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Users2,
  Clock,
  AppWindow,
  Network,
  Monitor,
  Package,
  RefreshCw,
  BarChart2,
  Bell,
  Shield,
  Settings,
  LogOut,
  Briefcase,
  Clock4,
  Target,
  MessageSquare,
  CalendarOff,
  CalendarDays,
  MapPin,
  Heart,
  ClipboardCheck,
  DollarSign,
  FileText,
  Star,
  Wallet,
  Network as OrgIcon,
  Rocket,
  GraduationCap,
  Gift,
  Video,
  FileCheck,
  Megaphone,
  CalendarRange,
  TrendingUp,
  FileBarChart,
  ShieldCheck,
  CreditCard,
  UserSearch,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type NavItem = { href: string; label: string; icon: React.ElementType }
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[]; module?: string }

/**
 * Menú del administrador: seis grupos que cuentan una sola historia —qué hace
 * el equipo con su tiempo— y un séptimo, "Talento", con los módulos de RR. HH.
 * que se activan por empresa en Configuración › Módulos. Sin esa marca, no se
 * ven: las rutas siguen existiendo, solo dejan de estorbar.
 */
const GROUPS: NavGroup[] = [
  {
    label: 'Personas',
    icon: Users,
    items: [
      { href: '/admin/users', label: 'Usuarios', icon: Users },
      { href: '/admin/teams', label: 'Equipos', icon: Users2 },
      { href: '/admin/org-chart', label: 'Organigrama', icon: OrgIcon },
    ],
  },
  {
    label: 'Tiempo',
    icon: Clock,
    items: [
      { href: '/admin/workday-compliance', label: 'Cumplimiento de jornada', icon: Clock },
      { href: '/admin/schedules', label: 'Horarios', icon: CalendarDays },
      { href: '/admin/absences', label: 'Ausencias', icon: CalendarOff },
      { href: '/admin/overtime', label: 'Horas extra', icon: Clock4 },
      { href: '/admin/work-locations', label: 'Ubicaciones', icon: MapPin },
    ],
  },
  {
    label: 'Productividad',
    icon: TrendingUp,
    items: [
      { href: '/admin/reports', label: 'Informes', icon: FileBarChart },
      { href: '/admin/metrics', label: 'Métricas', icon: BarChart2 },
      { href: '/admin/apps', label: 'Aplicaciones y sitios', icon: AppWindow },
      { href: '/admin/analyst', label: 'Analista IA', icon: Sparkles },
      { href: '/admin/alerts', label: 'Alertas', icon: Bell },
    ],
  },
  {
    label: 'Proyectos',
    icon: Briefcase,
    items: [{ href: '/admin/projects', label: 'Proyectos', icon: Briefcase }],
  },
  {
    label: 'Talento',
    icon: Heart,
    module: 'talento',
    items: [
      { href: '/admin/onboarding', label: 'Onboarding', icon: Rocket },
      { href: '/admin/recruitment', label: 'Reclutamiento', icon: UserSearch },
      { href: '/admin/goals', label: 'Objetivos', icon: Target },
      { href: '/admin/performance-reviews', label: 'Evaluaciones', icon: Star },
      { href: '/admin/1on1s', label: 'Reuniones 1:1', icon: Video },
      { href: '/admin/people-analytics', label: 'People Analytics', icon: TrendingUp },
      { href: '/admin/pto', label: 'Balance PTO', icon: CalendarDays },
      { href: '/admin/training', label: 'Capacitación', icon: GraduationCap },
      { href: '/admin/messages', label: 'Mensajes', icon: MessageSquare },
      { href: '/admin/pulse-surveys', label: 'Encuestas', icon: ClipboardCheck },
      { href: '/admin/kudos', label: 'Reconocimiento', icon: Heart },
      { href: '/admin/announcements', label: 'Anuncios', icon: Megaphone },
      { href: '/admin/company-calendar', label: 'Calendario', icon: CalendarRange },
      { href: '/admin/hr-documents', label: 'Documentos HR', icon: FileText },
      { href: '/admin/contracts', label: 'Contratos', icon: FileCheck },
      { href: '/admin/certificates', label: 'Certificados', icon: FileCheck },
      { href: '/admin/compliance', label: 'Cumplimiento', icon: ShieldCheck },
      { href: '/admin/payroll', label: 'Nómina', icon: DollarSign },
      { href: '/admin/expenses', label: 'Gastos', icon: Wallet },
      { href: '/admin/benefits', label: 'Beneficios', icon: Gift },
    ],
  },
  {
    label: 'Configuración',
    icon: Settings,
    items: [
      { href: '/admin/settings', label: 'Empresa y módulos', icon: Settings },
      { href: '/admin/devices', label: 'Dispositivos', icon: Monitor },
      { href: '/admin/data-quality', label: 'Calidad de datos', icon: ShieldCheck },
      { href: '/admin/agent-updates', label: 'Agente', icon: RefreshCw },
      { href: '/admin/app-inventory', label: 'Inventario de software', icon: Package },
      { href: '/admin/ips', label: 'IPs corporativas', icon: Network },
      { href: '/admin/audit', label: 'Auditoría', icon: Shield },
      { href: '/admin/billing', label: 'Facturación', icon: CreditCard },
    ],
  },
]

function NavGroup({ group, pathname }: { group: NavGroup; pathname: string }) {
  const isActiveGroup = group.items.some((i) => pathname.startsWith(i.href))
  const [open, setOpen] = useState(isActiveGroup)

  useEffect(() => {
    if (isActiveGroup) setOpen(true)
  }, [isActiveGroup])

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:bg-gray-50 hover:text-gray-600"
      >
        <group.icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5 pl-2">
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-blue-50 font-medium text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => router.push('/login'),
  })
  const { data: modules = {} } = trpc.admin.getModules.useQuery(undefined, {
    staleTime: 5 * 60_000,
  })

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3">
        <Image src="/brand/icon.svg" alt="BCWork" width={32} height={32} />
        <div>
          <span className="text-sm font-bold tracking-tight text-slate-800">BCWork</span>
          <p className="text-xs text-gray-400">Panel de administración</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <Link
          href="/admin/dashboard"
          className={`mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
            pathname.startsWith('/admin/dashboard')
              ? 'bg-blue-50 font-medium text-blue-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          Resumen
        </Link>

        <div className="space-y-1">
          {GROUPS.filter((g) => !g.module || modules[g.module]).map((group) => (
            <NavGroup key={group.label} group={group} pathname={pathname} />
          ))}
        </div>
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
