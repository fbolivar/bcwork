import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'

export const metadata = { title: 'Configuración inicial — BCWork' }

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <OnboardingWizard />
    </div>
  )
}
