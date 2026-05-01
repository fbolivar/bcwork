import { PlanEditor } from '@/features/platform/components/PlanEditor'

export const metadata = { title: 'Planes — BCWork Admin' }

export default function PlansPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Planes</h1>
      <PlanEditor />
    </div>
  )
}
