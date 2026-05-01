import { cn } from '@bcwork/ui'

const STATUS_STYLES: Record<string, string> = {
  trial: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  past_due: 'bg-orange-100 text-orange-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
  invited: 'bg-blue-100 text-blue-800',
  disabled: 'bg-gray-100 text-gray-500',
}

const LABEL: Record<string, string> = {
  trial: 'Trial',
  active: 'Activo',
  past_due: 'Vencido',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
  invited: 'Invitado',
  disabled: 'Deshabilitado',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600',
      )}
    >
      {LABEL[status] ?? status}
    </span>
  )
}
