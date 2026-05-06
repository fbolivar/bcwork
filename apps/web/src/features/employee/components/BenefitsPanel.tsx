'use client'

import { trpc } from '@/lib/trpc-client'
import {
  Heart,
  Truck,
  UtensilsCrossed,
  Monitor,
  Shield,
  Gift,
  Tag,
  AlertCircle,
} from 'lucide-react'

type BenefitCategory =
  | 'health'
  | 'transport'
  | 'food'
  | 'equipment'
  | 'insurance'
  | 'bonus'
  | 'other'

const CAT_MAP: Record<
  BenefitCategory,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  health: {
    label: 'Salud',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-100',
  },
  transport: {
    label: 'Transporte',
    icon: <Truck className="h-5 w-5" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-100',
  },
  food: {
    label: 'Alimentación',
    icon: <UtensilsCrossed className="h-5 w-5" />,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-100',
  },
  equipment: {
    label: 'Equipos',
    icon: <Monitor className="h-5 w-5" />,
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-gray-200',
  },
  insurance: {
    label: 'Seguro',
    icon: <Shield className="h-5 w-5" />,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-100',
  },
  bonus: {
    label: 'Bono',
    icon: <Gift className="h-5 w-5" />,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-100',
  },
  other: {
    label: 'Otro',
    icon: <Tag className="h-5 w-5" />,
    color: 'text-gray-500',
    bg: 'bg-gray-50 border-gray-200',
  },
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function isExpiringSoon(d: string | null) {
  if (!d) return false
  return (new Date(d).getTime() - Date.now()) / 86400000 <= 30
}

export function BenefitsPanel() {
  const { data: benefits, isLoading } = trpc.employee.getMyBenefits.useQuery()

  const personal = (benefits ?? []).filter((b) => b.employee_id)
  const company = (benefits ?? []).filter((b) => !b.employee_id)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis beneficios</h1>
        <p className="mt-0.5 text-sm text-gray-500">Paquete de beneficios y compensación</p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (benefits ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <Gift className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No hay beneficios registrados</p>
          <p className="mt-1 text-xs text-gray-400">Tu empleador los publicará aquí</p>
        </div>
      ) : (
        <div className="space-y-6">
          {personal.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Mis beneficios personales
              </p>
              <div className="space-y-2">
                {personal.map((b) => (
                  <BenefitCard key={b.id} benefit={b} />
                ))}
              </div>
            </div>
          )}
          {company.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Beneficios de la empresa
              </p>
              <div className="space-y-2">
                {company.map((b) => (
                  <BenefitCard key={b.id} benefit={b} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BenefitCard({
  benefit,
}: {
  benefit: {
    id: string
    title: string
    description: string | null
    category: string
    value: number | null
    currency: string
    expires_at: string | null
  }
}) {
  const cat = CAT_MAP[benefit.category as BenefitCategory] ?? CAT_MAP.other
  const expiring = isExpiringSoon(benefit.expires_at)
  const expired = benefit.expires_at ? new Date(benefit.expires_at) < new Date() : false

  return (
    <div
      className={`flex items-start gap-4 rounded-xl border p-4 ${expired ? 'border-red-100 bg-red-50' : expiring ? 'border-yellow-100 bg-yellow-50' : cat.bg}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ${cat.color}`}
      >
        {cat.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{benefit.title}</p>
          <span className={`rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium ${cat.color}`}>
            {cat.label}
          </span>
        </div>
        {benefit.description && (
          <p className="mt-0.5 text-xs text-gray-500">{benefit.description}</p>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
          {benefit.value != null && (
            <span className="font-semibold text-gray-700">
              {fmtCurrency(benefit.value, benefit.currency)}
            </span>
          )}
          {benefit.expires_at && (
            <span className={expired ? 'text-red-500' : expiring ? 'text-yellow-600' : ''}>
              {expired
                ? 'Vencido'
                : `Vence ${new Date(benefit.expires_at + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            </span>
          )}
        </div>
      </div>
      {expired && <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
    </div>
  )
}
