import { DeviceManager } from '@/features/admin/components/DeviceManager'
import { TenantInstallerCard } from '@/features/admin/components/TenantInstallerCard'

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dispositivos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona los agentes instalados en dispositivos de tus colaboradores.
        </p>
      </div>
      <TenantInstallerCard />
      <DeviceManager />
    </div>
  )
}
