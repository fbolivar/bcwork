import { UpsellPipeline } from '@/features/platform/components/UpsellPipeline'

export default function UpsellPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pipeline de Upsell / Expansión</h1>
        <p className="mt-1 text-sm text-gray-500">
          Oportunidades de crecimiento identificadas automáticamente basadas en uso y capacidad.
        </p>
      </div>
      <UpsellPipeline />
    </div>
  )
}
