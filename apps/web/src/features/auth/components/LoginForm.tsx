'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { useAuthStore } from '../store/authStore'

export function LoginForm() {
  const router = useRouter()
  const { setUser } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [showMfa, setShowMfa] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      // Establecer cookies httpOnly vía route handler (el middleware las necesita)
      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        }),
      })
      setUser(data.user)
      if (data.mustChangePassword) {
        router.push('/change-password')
      } else {
        router.push(getDashboard(data.user.role))
      }
    },
    onError: (err) => {
      const msg = err.message
      if (msg.includes('MFA')) setShowMfa(true)
      setError(msg)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    loginMutation.mutate({
      email,
      password,
      mfa_code: showMfa ? mfaCode : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Correo electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showMfa && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Código de autenticación (6 dígitos)
          </label>
          <input
            type="text"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loginMutation.isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {loginMutation.isPending ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}

function getDashboard(role: string) {
  switch (role) {
    case 'platform_admin':
      return '/super-admin'
    case 'tenant_admin':
      return '/admin/dashboard'
    case 'manager':
      return '/manager/dashboard'
    default:
      return '/me/dashboard'
  }
}
