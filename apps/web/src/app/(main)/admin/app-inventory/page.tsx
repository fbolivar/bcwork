import { AppInventoryManager } from '@/features/admin/components/AppInventoryManager'

export const metadata = { title: 'Inventario de aplicaciones — BCWork Admin' }

export default function AppInventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Inventario de aplicaciones</h1>
        <p className="mt-1 text-sm text-gray-500">
          Todas las aplicaciones instaladas en los equipos con el agente BCWork, no solo las que se
          usan.
        </p>
      </div>
      <AppInventoryManager />
    </div>
  )
}
