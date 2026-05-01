import { AppCatalogManager } from '@/features/admin/components/AppCatalogManager'

export const metadata = { title: 'Aplicaciones — BCWork Admin' }

export default function AppsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Catálogo de aplicaciones</h1>
      <AppCatalogManager />
    </div>
  )
}
