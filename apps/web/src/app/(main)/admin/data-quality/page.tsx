import { DataQualityPanel } from '@/features/admin/components/DataQualityPanel'

export const metadata = { title: 'Calidad de datos — BCWork Admin' }

export default function DataQualityPage() {
  return (
    <div className="p-6">
      <DataQualityPanel />
    </div>
  )
}
