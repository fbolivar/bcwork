import { RecruitmentPanel } from '@/features/admin/components/RecruitmentPanel'

export const metadata = { title: 'Reclutamiento — BCWork Admin' }

export default function RecruitmentPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Reclutamiento</h1>
      <p className="mb-6 text-sm text-gray-500">Gestiona vacantes y pipeline de candidatos</p>
      <RecruitmentPanel />
    </div>
  )
}
