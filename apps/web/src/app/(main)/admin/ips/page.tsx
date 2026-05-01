import { IpRangeManager } from '@/features/admin/components/IpRangeManager'

export const metadata = { title: 'IPs Corporativas — BCWork Admin' }

export default function IpsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Rangos IP corporativos</h1>
      <IpRangeManager />
    </div>
  )
}
