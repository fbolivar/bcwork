'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc-client'
import { formatDate } from '@/lib/format'
import { InviteUserModal } from './InviteUserModal'
import {
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  X,
  Check,
  Loader2,
  CalendarDays,
  ChevronDown,
} from 'lucide-react'

type Role = 'tenant_admin' | 'manager' | 'employee' | 'all'
type Status = 'active' | 'disabled' | 'all'

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Admin',
  manager: 'Manager',
  employee: 'Empleado',
}

type UserRow = {
  id: string
  full_name: string | null
  email: string
  role: string
  status: string | null
  department: string | null
  mfa_enabled: boolean | null
  must_change_password: boolean | null
  last_login_at: string | null
}

// ─── Location Modal ────────────────────────────────────────────────────────────

function LocationModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const utils = trpc.useUtils()

  const setLocation = trpc.manager.setUserLocation.useMutation({
    onSuccess: (data) => {
      void utils.manager.getTeamGeoLocations.invalidate()
      if (data.resolved) onClose()
    },
  })

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
            <label htmlFor="loc-city" className="mb-1 block text-xs font-medium text-gray-600">
              Ciudad
            </label>
            <input
              id="loc-city"
              type="text"
              placeholder="Ej: Bogotá, Medellín, Ciudad de México..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="loc-country" className="mb-1 block text-xs font-medium text-gray-600">
              País
            </label>
            <input
              id="loc-country"
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
            No se encontraron coordenadas para esa ciudad. Intenta ser más específico.
          </p>
        )}
        {setLocation.isError && (
          <p className="mt-3 text-xs text-red-500">Error al guardar. Intenta de nuevo.</p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!city && !country) return
              setLocation.mutate({
                userId: user.id,
                city: city || undefined,
                country: country || undefined,
              })
            }}
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
            onClick={() => {
              setLocation.mutate({ userId: user.id, city: undefined, country: undefined })
              onClose()
            }}
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

// ─── Assign Schedule Modal ─────────────────────────────────────────────────────

function AssignScheduleModal({
  user,
  currentScheduleId,
  onClose,
}: {
  user: UserRow
  currentScheduleId: string | null
  onClose: () => void
}) {
  const [scheduleId, setScheduleId] = useState<string>(currentScheduleId ?? '')
  const utils = trpc.useUtils()

  const { data: schedules } = trpc.admin.listSchedules.useQuery()
  const assign = trpc.admin.assignSchedule.useMutation({
    onSuccess: () => {
      void utils.admin.getScheduleAssignments.invalidate()
      onClose()
    },
  })

  const handleSave = () => {
    assign.mutate({ userId: user.id, scheduleId: scheduleId || null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Asignar horario</h2>
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

        <div>
          <label
            htmlFor="schedule-select"
            className="mb-1.5 block text-xs font-medium text-gray-600"
          >
            Horario laboral
          </label>
          <div className="relative">
            <select
              id="schedule-select"
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin horario asignado</option>
              {(schedules ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.start_time} a {s.end_time}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {scheduleId && (
            <p className="mt-1.5 text-[11px] text-gray-400">
              El cambio aplica desde hoy. El horario anterior quedará como histórico.
            </p>
          )}
        </div>

        {assign.isError && <p className="mt-3 text-xs text-red-500">{assign.error.message}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={assign.isPending || scheduleId === (currentScheduleId ?? '')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {assign.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Guardar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── UserTable ─────────────────────────────────────────────────────────────────

export function UserTable() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role>('all')
  const [status, setStatus] = useState<Status>('all')
  const [page, setPage] = useState(1)
  const [showInvite, setShowInvite] = useState(false)
  const [locationUser, setLocationUser] = useState<UserRow | null>(null)
  const [scheduleUser, setScheduleUser] = useState<UserRow | null>(null)

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.admin.listUsers.useQuery(
    { search: search || undefined, role, status, page, pageSize: 20 },
    { placeholderData: keepPreviousData },
  )
  const { data: assignments } = trpc.admin.getScheduleAssignments.useQuery()
  const updateMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  })

  const assignmentMap = new Map(
    (assignments ?? []).map((a) => [a.userId, { scheduleId: a.scheduleId, name: a.scheduleName }]),
  )

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
              <th className="px-4 py-3 text-left font-medium text-gray-500">Horario</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Último acceso</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((user) => {
              const assignment = assignmentMap.get(user.id)
              return (
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
                    <button
                      type="button"
                      title="Cambiar horario"
                      onClick={() => setScheduleUser(user as UserRow)}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        assignment?.name
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <CalendarDays className="h-3 w-3" />
                      {assignment?.name ?? 'Sin horario'}
                    </button>
                  </td>
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
              )
            })}
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
      {scheduleUser && (
        <AssignScheduleModal
          user={scheduleUser}
          currentScheduleId={assignmentMap.get(scheduleUser.id)?.scheduleId ?? null}
          onClose={() => setScheduleUser(null)}
        />
      )}
    </div>
  )
}
