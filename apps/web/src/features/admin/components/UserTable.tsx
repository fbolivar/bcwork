'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc-client'
import { formatDate } from '@/lib/format'
import { InviteUserModal } from './InviteUserModal'
import { UserPlus, ShieldCheck, AlertTriangle, MapPin, X, Check, Loader2 } from 'lucide-react'

type Role = 'tenant_admin' | 'manager' | 'employee' | 'all'
type Status = 'active' | 'disabled' | 'all'

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Admin',
  manager: 'Manager',
  employee: 'Empleado',
}

type UserRow = {
  id: string
  full_name: string
  email: string
  role: string
  status: string | null
  department: string | null
  mfa_enabled: boolean | null
  must_change_password: boolean | null
  last_login_at: string | null
}

function LocationModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const utils = trpc.useUtils()

  const setLocation = trpc.manager.setUserLocation.useMutation({
    onSuccess: (data) => {
      void utils.manager.getTeamGeoLocations.invalidate()
      if (data.resolved) {
        onClose()
      }
    },
  })

  const handleSave = () => {
    if (!city && !country) return
    setLocation.mutate({ userId: user.id, city: city || undefined, country: country || undefined })
  }

  const handleClear = () => {
    setLocation.mutate({ userId: user.id, city: undefined, country: undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Ubicación del usuario</h2>
            <p className="mt-0.5 text-xs text-gray-400">{user.full_name || user.email}</p>
          </div>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Ciudad</label>
            <input
              type="text"
              placeholder="Ej: Bogotá, Medellín, Ciudad de México..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">País</label>
            <input
              type="text"
              placeholder="Ej: Colombia, México, España..."
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {setLocation.data && !setLocation.data.resolved && !setLocation.isPending && (
          <p className="mt-3 text-xs text-amber-600">
            No se encontraron coordenadas para esa ciudad. Intenta ser más específico (ej:
            &quot;Bogotá, Colombia&quot;).
          </p>
        )}

        {setLocation.isError && (
          <p className="mt-3 text-xs text-red-500">Error al guardar. Intenta de nuevo.</p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={setLocation.isPending || (!city && !country)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {setLocation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Guardar y geolocalizar
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
          >
            Limpiar
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-gray-400">
          Las coordenadas se obtienen de OpenStreetMap Nominatim
        </p>
      </div>
    </div>
  )
}

export function UserTable() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role>('all')
  const [status, setStatus] = useState<Status>('all')
  const [page, setPage] = useState(1)
  const [showInvite, setShowInvite] = useState(false)
  const [locationUser, setLocationUser] = useState<UserRow | null>(null)

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.admin.listUsers.useQuery(
    { search: search || undefined, role, status, page, pageSize: 20 },
    { placeholderData: keepPreviousData },
  )
  const updateMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  })

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="min-w-48 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          aria-label="Filtrar por rol"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role)
            setPage(1)
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos los roles</option>
          <option value="tenant_admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Empleado</option>
        </select>
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as Status)
            setPage(1)
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="disabled">Deshabilitados</option>
        </select>
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Invitar usuario
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Departamento</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Último acceso</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{user.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                    {user.mfa_enabled && (
                      <span title="MFA activo">
                        <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                      </span>
                    )}
                    {user.must_change_password && (
                      <span title="Debe cambiar contraseña">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{user.department ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {user.status === 'active' ? 'Activo' : 'Deshabilitado'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {user.last_login_at ? formatDate(user.last_login_at) : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Asignar ubicación geográfica"
                      onClick={() => setLocationUser(user as UserRow)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Ubicación
                    </button>
                    {user.role !== 'tenant_admin' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateMutation.mutate({
                            id: user.id,
                            status: user.status === 'active' ? 'disabled' : 'active',
                          })
                        }
                        disabled={updateMutation.isPending}
                        className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                          user.status === 'active'
                            ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {user.status === 'active' ? 'Deshabilitar' : 'Habilitar'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} de{' '}
            {data.total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * data.pageSize >= data.total}
              className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
      {locationUser && <LocationModal user={locationUser} onClose={() => setLocationUser(null)} />}
    </div>
  )
}
