import { BulkEmailComposer } from '@/features/platform/components/BulkEmailComposer'

export default function BulkEmailPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Email masivo por segmento</h1>
        <p className="mt-1 text-sm text-gray-500">
          Envía comunicaciones a grupos de empresas filtradas por estado, plan o etiquetas.
        </p>
      </div>
      <BulkEmailComposer />
    </div>
  )
}
