import { AppCatalogManager } from '@/features/admin/components/AppCatalogManager'
import { ClassificationQueue } from '@/features/admin/components/ClassificationQueue'

export const metadata = { title: 'Aplicaciones y sitios — BCWork Admin' }

export default function AppsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-4 text-xl font-bold text-gray-900">Aplicaciones y sitios</h1>
        <ClassificationQueue />
      </div>
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Catálogo completo
        </h2>
        <AppCatalogManager />
      </div>
    </div>
  )
}
