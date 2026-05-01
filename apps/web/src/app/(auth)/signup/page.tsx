import Link from 'next/link'
import { SignupForm } from '@/features/auth/components/SignupForm'

export const metadata = { title: 'Registro — BCWork' }

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BCWork</h1>
          <p className="mt-1 text-sm text-gray-500">
            Registra tu empresa — 14 días gratis, sin tarjeta de crédito
          </p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  )
}
