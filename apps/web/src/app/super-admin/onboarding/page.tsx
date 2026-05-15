import { OnboardingFunnel } from '@/features/platform/components/OnboardingFunnel'

export const metadata = { title: 'Onboarding — BCWork Super Admin' }

export default function OnboardingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Onboarding de clientes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Seguimiento de adopción · identifica empresas atascadas y envía recordatorios
        </p>
      </div>
      <OnboardingFunnel />
    </div>
  )
}
