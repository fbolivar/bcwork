import { SettingsPanel } from '@/features/admin/components/SettingsPanel'

export const metadata = { title: 'Configuración — BCWork Admin' }

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Configuración de la empresa</h1>
      <SettingsPanel />
    </div>
  )
}
