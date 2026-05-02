'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { useAuthStore } from '@/features/auth/store/authStore'
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react'

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-4 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const checks = [
    { label: 'Al menos 8 caracteres', ok: password.length >= 8 },
    { label: 'Una mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Un número', ok: /\d/.test(password) },
    { label: 'Un símbolo (!@#$...)', ok: /[^A-Za-z0-9]/.test(password) },
  ]

  const passed = checks.filter((c) => c.ok).length
  const color =
    passed <= 1
      ? 'bg-red-500'
      : passed <= 2
        ? 'bg-yellow-500'
        : passed <= 3
          ? 'bg-blue-500'
          : 'bg-green-500'

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i <= passed ? color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${c.ok ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className={`text-xs ${c.ok ? 'text-green-700' : 'text-gray-400'}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { clearUser } = useAuthStore()

  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const change = trpc.auth.changePassword.useMutation({
    onSuccess: async () => {
      // Backend revoca todas las sesiones — limpiamos estado local y redirigimos
      await fetch('/api/auth/clear-session', { method: 'POST' }).catch(() => {})
      clearUser()
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    },
    onError: (err) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPass !== confirm) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    if (newPass.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }

    change.mutate({ currentPassword: current, newPassword: newPass })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cambiar contraseña</h1>
          <p className="mt-1 text-sm text-gray-500">
            Por seguridad, debes establecer una nueva contraseña antes de continuar.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-semibold text-gray-900">¡Contraseña actualizada!</p>
              <p className="text-sm text-gray-500">
                Serás redirigido al inicio de sesión en un momento...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <PasswordInput
                label="Contraseña actual"
                value={current}
                onChange={setCurrent}
                placeholder="Tu contraseña actual"
              />

              <div>
                <PasswordInput
                  label="Nueva contraseña"
                  value={newPass}
                  onChange={setNewPass}
                  placeholder="Mínimo 8 caracteres"
                />
                <PasswordStrength password={newPass} />
              </div>

              <PasswordInput
                label="Confirmar nueva contraseña"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repite la nueva contraseña"
              />

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                <strong>Nota:</strong> Al cambiar tu contraseña se cerrarán todas tus sesiones
                activas y deberás iniciar sesión nuevamente.
              </div>

              <button
                type="submit"
                disabled={change.isPending || !current || !newPass || !confirm}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {change.isPending ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          BCWork · Ley 1581/2012 protección de datos
        </p>
      </div>
    </div>
  )
}
