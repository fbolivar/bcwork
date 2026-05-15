import { FeatureAdoptionPanel } from '@/features/platform/components/FeatureAdoptionPanel'

export const metadata = { title: 'Adopción de Features — BCWork Super Admin' }

export default function FeaturesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Adopción de Features</h1>
        <p className="mt-1 text-sm text-gray-500">
          Qué funcionalidades usan tus clientes y dónde hay oportunidades de upsell
        </p>
      </div>
      <FeatureAdoptionPanel />
    </div>
  )
}
