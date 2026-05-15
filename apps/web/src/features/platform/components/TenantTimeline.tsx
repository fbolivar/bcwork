'use client'

import { trpc } from '@/lib/trpc-client'
import { formatDateTime } from '@/lib/format'
import {
  Plus,
  Settings,
  PauseCircle,
  PlayCircle,
  XCircle,
  LogIn,
  CalendarPlus,
  Wrench,
  CreditCard,
  Mail,
} from 'lucide-react'

type TimelineEvent = {
  id: string
  action: string
  occurred_at: string
  after_state: Record<string, unknown> | null
}

type EventConfig = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  dot: string
}

const EVENT_CONFIGS: Record<string, EventConfig> = {
  'tenant.created': {
    label: 'Empresa creada',
    icon: Plus,
    color: 'text-blue-600',
    dot: 'bg-blue-400',
  },
  'tenant.updated': {
    label: 'Empresa actualizada',
    icon: Settings,
    color: 'text-gray-500',
    dot: 'bg-gray-300',
  },
  'tenant.suspended': {
    label: 'Empresa suspendida',
    icon: PauseCircle,
    color: 'text-yellow-600',
    dot: 'bg-yellow-400',
  },
  'tenant.reactivated': {
    label: 'Empresa reactivada',
    icon: PlayCircle,
    color: 'text-green-600',
    dot: 'bg-green-400',
  },
  'tenant.cancelled': {
    label: 'Empresa cancelada',
    icon: XCircle,
    color: 'text-red-600',
    dot: 'bg-red-400',
  },
  'tenant.impersonated': {
    label: 'Sesión impersonada',
    icon: LogIn,
    color: 'text-violet-600',
    dot: 'bg-violet-400',
  },
  'tenant.trial_extended': {
    label: 'Trial extendido',
    icon: CalendarPlus,
    color: 'text-cyan-600',
    dot: 'bg-cyan-400',
  },
  'tenant.maintenance_on': {
    label: 'Mantenimiento activado',
    icon: Wrench,
    color: 'text-orange-600',
    dot: 'bg-orange-400',
  },
  'tenant.maintenance_off': {
    label: 'Mantenimiento desactivado',
    icon: Wrench,
    color: 'text-gray-500',
    dot: 'bg-gray-300',
  },
  'license.created': {
    label: 'Licencia creada',
    icon: CreditCard,
    color: 'text-blue-600',
    dot: 'bg-blue-400',
  },
  'license.updated': {
    label: 'Licencia actualizada',
    icon: CreditCard,
    color: 'text-gray-500',
    dot: 'bg-gray-300',
  },
}

function getConfig(action: string): EventConfig {
  // Detect maintenance from after_state if action is generic tenant.updated
  return (
    EVENT_CONFIGS[action] ?? {
      label: action,
      icon: Settings,
      color: 'text-gray-400',
      dot: 'bg-gray-200',
    }
  )
}

function getDetail(event: TimelineEvent): string | null {
  const s = event.after_state
  if (!s) return null
  if (event.action === 'tenant.updated' && s.maintenance_mode === true)
    return `Mensaje: ${s.maintenance_message ?? '—'}`
  if (event.action === 'tenant.updated' && s.email_sent_to)
    return `Email enviado a ${s.email_sent_to}`
  if (event.action === 'license.updated' && s.extended_days)
    return `+${s.extended_days} días · Vence: ${s.new_end_date ?? '—'}`
  if (event.action === 'tenant.impersonated' && s.by) return `Por ${s.by}`
  return null
}

export function TenantTimeline({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = trpc.platform.getTenantTimeline.useQuery(
    { tenantId },
    { refetchInterval: 120_000 },
  )

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Mail className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">Línea de tiempo</h2>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <p className="text-xs text-gray-400">Sin eventos registrados</p>
      )}

      <div className="relative ml-2">
        {(data as TimelineEvent[] | undefined)?.map((event, idx) => {
          const cfg = getConfig(event.action)
          const Icon = cfg.icon
          const detail = getDetail(event)
          const isLast = idx === (data?.length ?? 0) - 1
          return (
            <div key={event.id} className="relative flex gap-3 pb-4">
              {/* Vertical line */}
              {!isLast && <div className="absolute bottom-0 left-[7px] top-5 w-px bg-gray-100" />}
              {/* Dot */}
              <div
                className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${cfg.dot} ring-2 ring-white`}
              />
              <div>
                <div className="flex items-baseline gap-2">
                  <p className={`text-sm font-medium ${cfg.color}`}>
                    <Icon className="mr-1 inline h-3.5 w-3.5" />
                    {cfg.label}
                  </p>
                </div>
                {detail && <p className="text-xs text-gray-500">{detail}</p>}
                <p className="text-xs text-gray-400">{formatDateTime(event.occurred_at)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
