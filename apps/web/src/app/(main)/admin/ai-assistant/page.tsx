import { AIAssistantPanel } from '@/features/admin/components/AIAssistantPanel'

export const metadata = { title: 'Asistente HR — BCWork Admin' }

export default function AIAssistantPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Asistente HR</h1>
      <p className="mb-6 text-sm text-gray-500">Consulta datos de tu empresa en lenguaje natural</p>
      <AIAssistantPanel />
    </div>
  )
}
