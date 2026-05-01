import { TenantDetail } from '@/features/platform/components/TenantDetail'

export const metadata = { title: 'Empresa — BCWork Admin' }

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <TenantDetailAsync params={params} />
}

async function TenantDetailAsync({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <TenantDetail tenantId={id} />
    </div>
  )
}
