import Link from 'next/link'
import {
  Building2,
  Users,
  BarChart2,
  FileText,
  CreditCard,
  Shield,
  RefreshCw,
  Rocket,
} from 'lucide-react'

const LINKS = [
  {
    href: '/super-admin/tenants',
    icon: Building2,
    label: 'Empresas',
    desc: 'Gestionar tenants y licencias',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/super-admin/users',
    icon: Users,
    label: 'Usuarios',
    desc: 'Buscar usuarios de la plataforma',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    href: '/super-admin/revenue',
    icon: CreditCard,
    label: 'Revenue',
    desc: 'MRR, ARR y tendencia mensual',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    href: '/super-admin/renewals',
    icon: RefreshCw,
    label: 'Renovaciones',
    desc: 'Pipeline de licencias por vencer',
    color: 'bg-cyan-50 text-cyan-600',
  },
  {
    href: '/super-admin/onboarding',
    icon: Rocket,
    label: 'Onboarding',
    desc: 'Funnel de adopción de clientes',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    href: '/super-admin/metrics',
    icon: BarChart2,
    label: 'Métricas',
    desc: 'KPIs y gráficos de crecimiento',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    href: '/super-admin/plans',
    icon: Shield,
    label: 'Planes',
    desc: 'Administrar planes y precios',
    color: 'bg-rose-50 text-rose-600',
  },
  {
    href: '/super-admin/audit',
    icon: FileText,
    label: 'Auditoría',
    desc: 'Historial completo de acciones',
    color: 'bg-gray-100 text-gray-600',
  },
]

export function QuickLinks() {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Accesos rápidos
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${link.color}`}
            >
              <link.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{link.label}</p>
              <p className="text-xs text-gray-400">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
