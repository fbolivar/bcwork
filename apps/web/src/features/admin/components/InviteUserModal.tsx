'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { X, Copy, Check } from 'lucide-react'

interface Props {
  onClose: () => void
}

export function InviteUserModal({ onClose }: Props) {
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'employee' as 'manager' | 'employee',
    department: '',
    position: '',
  })
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const utils = trpc.useUtils()
  const invite = trpc.admin.inviteUser.useMutation({
    onSuccess: (data) => {
      setResult({ email: data.email, tempPassword: data.tempPassword })
      void utils.admin.listUsers.invalidate()
    },
  })

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result?.tempPassword ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Invitar usuario</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4 p-6">
            <p className="text-sm text-gray-600">
              Usuario <strong>{result.email}</strong> creado. Comparte la contraseña temporal de
              forma segura:
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3">
              <code className="flex-1 font-mono text-sm text-gray-800">{result.tempPassword}</code>
              <button
                onClick={handleCopy}
                className="rounded p-1.5 text-gray-500 hover:bg-gray-200"
                title="Copiar"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              El usuario deberá cambiar su contraseña en el primer acceso.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Listo
            </button>
          </div>
        ) : (
          <form
            className="space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault()
              invite.mutate({
                email: form.email,
                full_name: form.full_name,
                role: form.role,
                ...(form.department ? { department: form.department } : {}),
                ...(form.position ? { position: form.position } : {}),
              })
            }}
          >
            <Field label="Email *">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="input"
                placeholder="juan@empresa.com"
              />
            </Field>
            <Field label="Nombre completo *">
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="input"
                placeholder="Juan Pérez"
              />
            </Field>
            <Field label="Rol *">
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as 'manager' | 'employee' }))
                }
                className="input"
              >
                <option value="employee">Empleado</option>
                <option value="manager">Manager</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Departamento">
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  className="input"
                  placeholder="TI"
                />
              </Field>
              <Field label="Cargo">
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  className="input"
                  placeholder="Desarrollador"
                />
              </Field>
            </div>

            {invite.error && <p className="text-sm text-red-600">{invite.error.message}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={invite.isPending}
                className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {invite.isPending ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`.input { width: 100%; border-radius: 6px; border: 1px solid #d1d5db; padding: 8px 12px; font-size: 14px; outline: none; } .input:focus { box-shadow: 0 0 0 2px #3b82f6; border-color: transparent; }`}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}
