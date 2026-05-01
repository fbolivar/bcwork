'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'

export function SignupForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    legal_name: '',
    trade_name: '',
    nit: '',
    contact_email: '',
    contact_phone: '',
    admin_full_name: '',
    admin_password: '',
    confirmPassword: '',
  })

  const signupMutation = trpc.auth.signupTenant.useMutation({
    onSuccess: () => {
      router.push('/login?registered=1')
    },
    onError: (err) => setError(err.message),
  })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.admin_password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    signupMutation.mutate({
      legal_name: form.legal_name,
      trade_name: form.trade_name || undefined,
      nit: form.nit,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone || undefined,
      admin_full_name: form.admin_full_name,
      admin_password: form.admin_password,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Datos de la empresa
        </legend>

        <Field
          label="Razón social *"
          type="text"
          value={form.legal_name}
          onChange={set('legal_name')}
          required
        />
        <Field
          label="Nombre comercial"
          type="text"
          value={form.trade_name}
          onChange={set('trade_name')}
        />
        <Field
          label="NIT *"
          type="text"
          value={form.nit}
          onChange={set('nit')}
          placeholder="123456789-0"
          required
        />
        <Field
          label="Email de contacto *"
          type="email"
          value={form.contact_email}
          onChange={set('contact_email')}
          required
        />
        <Field
          label="Teléfono"
          type="tel"
          value={form.contact_phone}
          onChange={set('contact_phone')}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Usuario administrador
        </legend>

        <Field
          label="Nombre completo *"
          type="text"
          value={form.admin_full_name}
          onChange={set('admin_full_name')}
          required
        />
        <Field
          label="Contraseña *"
          type="password"
          value={form.admin_password}
          onChange={set('admin_password')}
          required
          hint="Mínimo 12 caracteres, mayúscula, minúscula, número y símbolo"
        />
        <Field
          label="Confirmar contraseña *"
          type="password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          required
        />
      </fieldset>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="text-xs text-gray-500">
        Al registrarte aceptas el tratamiento de tus datos conforme a la{' '}
        <strong>Ley 1581 de 2012</strong> (HabeasData). Tu información no será compartida con
        terceros sin tu consentimiento.
      </p>

      <button
        type="submit"
        disabled={signupMutation.isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {signupMutation.isPending ? 'Registrando...' : 'Iniciar prueba gratuita — 14 días'}
      </button>
    </form>
  )
}

function Field({
  label,
  hint,
  ...props
}: {
  label: string
  hint?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}
