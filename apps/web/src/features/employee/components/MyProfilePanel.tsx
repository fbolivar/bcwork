'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { User, Shield, Key, CheckCircle2, CalendarDays } from 'lucide-react'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  )
}

const ROLE_LABELS: Record<string, string> = {
  employee: 'Empleado',
  manager: 'Manager',
  admin: 'Administrador',
  platform_admin: 'Super Admin',
}

export function MyProfilePanel() {
  const utils = trpc.useUtils()
  const { data: profile, isLoading } = trpc.employee.getMyProfile.useQuery()
  const { data: schedule } = trpc.employee.getMySchedule.useQuery()

  const [editName, setEditName] = useState('')
  const [editDept, setEditDept] = useState('')
  const [editPos, setEditPos] = useState('')
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  const updateProfile = trpc.employee.updateMyProfile.useMutation({
    onSuccess: () => {
      void utils.employee.getMyProfile.invalidate()
      setEditingProfile(false)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    },
  })

  const changePassword = trpc.employee.changeMyPassword.useMutation({
    onSuccess: () => {
      setCurPass('')
      setNewPass('')
      setConfirmPass('')
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 3000)
    },
  })

  function startEdit() {
    setEditName(profile?.full_name ?? '')
    setEditDept(profile?.department ?? '')
    setEditPos(profile?.position ?? '')
    setEditingProfile(true)
  }

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mi perfil</h1>
        <p className="mt-1 text-sm text-gray-500">Tus datos personales y configuración de acceso</p>
      </div>

      {/* Datos personales */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Datos personales</h2>
          </div>
          <div className="flex items-center gap-2">
            {profile?.role && (
              <Badge
                label={ROLE_LABELS[profile.role] ?? profile.role}
                color="bg-blue-50 text-blue-700"
              />
            )}
            {profile?.mfa_enabled && (
              <Badge label="MFA activo" color="bg-green-50 text-green-700" />
            )}
          </div>
        </div>

        {editingProfile ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              updateProfile.mutate({
                full_name: editName || undefined,
                department: editDept || undefined,
                position: editPos || undefined,
              })
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-name" className="mb-1 block text-xs font-medium text-gray-600">
                  Nombre completo
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-email"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Correo electrónico
                </label>
                <input
                  id="edit-email"
                  type="email"
                  value={profile?.email ?? ''}
                  disabled
                  placeholder="correo@empresa.com"
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="edit-dept" className="mb-1 block text-xs font-medium text-gray-600">
                  Departamento
                </label>
                <input
                  id="edit-dept"
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Tecnología"
                />
              </div>
              <div>
                <label htmlFor="edit-pos" className="mb-1 block text-xs font-medium text-gray-600">
                  Cargo
                </label>
                <input
                  id="edit-pos"
                  type="text"
                  value={editPos}
                  onChange={(e) => setEditPos(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Desarrollador Senior"
                />
              </div>
            </div>
            {updateProfile.error && (
              <p className="text-sm text-red-600">{updateProfile.error.message}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Nombre', value: profile?.full_name ?? '—' },
                { label: 'Correo', value: profile?.email ?? '—' },
                { label: 'Departamento', value: profile?.department ?? '—' },
                { label: 'Cargo', value: profile?.position ?? '—' },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-xs font-medium text-gray-500">{f.label}</p>
                  <p className="mt-0.5 text-sm text-gray-900">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              {profileSaved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Cambios guardados
                </span>
              )}
              <button
                type="button"
                onClick={startEdit}
                className="ml-auto rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Editar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Horario de trabajo */}
      {schedule && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Mi horario de trabajo</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-500">Turno</p>
              <p className="mt-0.5 text-sm text-gray-900">{schedule.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Horas semanales</p>
              <p className="mt-0.5 text-sm text-gray-900">{schedule.weekly_hours}h / semana</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Horario</p>
              <p className="mt-0.5 text-sm text-gray-900">
                {schedule.start_time.slice(0, 5)} – {schedule.end_time.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Descanso</p>
              <p className="mt-0.5 text-sm text-gray-900">{schedule.break_minutes} min</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-gray-500">Días laborables</p>
            <div className="flex gap-1.5">
              {DAY_NAMES.map((name, idx) => {
                const active = schedule.days_of_week.includes(idx)
                return (
                  <span
                    key={name}
                    className={`flex h-7 w-8 items-center justify-center rounded-md text-xs font-medium ${
                      active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {name}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Seguridad */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Key className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Cambiar contraseña</h2>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (newPass !== confirmPass) return
            changePassword.mutate({ currentPassword: curPass, newPassword: newPass })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="cur-pass" className="mb-1 block text-xs font-medium text-gray-600">
                Contraseña actual
              </label>
              <input
                id="cur-pass"
                type="password"
                value={curPass}
                onChange={(e) => setCurPass(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="new-pass" className="mb-1 block text-xs font-medium text-gray-600">
                Nueva contraseña
              </label>
              <input
                id="new-pass"
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-pass"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirm-pass"
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
                placeholder="Repite la contraseña"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {newPass && confirmPass && newPass !== confirmPass && (
            <p className="text-sm text-red-600">Las contraseñas no coinciden</p>
          )}
          {changePassword.error && (
            <p className="text-sm text-red-600">{changePassword.error.message}</p>
          )}
          {pwSaved && (
            <p className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Contraseña actualizada
            </p>
          )}

          <button
            type="submit"
            disabled={changePassword.isPending || (!!newPass && newPass !== confirmPass)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {changePassword.isPending ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>

        {profile?.mfa_enabled && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
            <Shield className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-700">
              Autenticación de dos factores (MFA) activa en tu cuenta.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
