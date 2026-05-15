import { Wrench } from 'lucide-react'

export function MaintenanceBanner({ message }: { message?: string | null }) {
  return (
    <div className="flex items-center gap-3 bg-orange-500 px-6 py-2.5 text-white">
      <Wrench className="h-4 w-4 shrink-0" />
      <p className="text-sm font-medium">
        {message?.trim() ||
          'Esta cuenta está en modo mantenimiento. Algunas funciones pueden no estar disponibles.'}
      </p>
    </div>
  )
}
