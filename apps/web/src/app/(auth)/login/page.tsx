import Link from 'next/link'
import { LoginForm } from '@/features/auth/components/LoginForm'

export const metadata = { title: 'Ingresar — BCWork' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; registered?: string }>
}) {
  const params = await searchParams
  const expired = params.expired === '1'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BCWork</h1>
          <p className="mt-1 text-sm text-gray-500">Ingresa a tu cuenta</p>
        </div>

        <LoginForm expired={expired} />

        <p className="text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:underline">
            Prueba gratis 14 días
          </Link>
        </p>
      </div>
    </div>
  )
}
