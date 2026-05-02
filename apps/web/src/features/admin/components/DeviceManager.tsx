'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { trpc } from '@/lib/trpc-client'
import { formatDate } from '@/lib/format'
import { Monitor, ShieldOff, Copy, Check, Trash2, Lock, Unlock } from 'lucide-react'

const PLATFORM_LABELS: Record<string, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
}

function getOnlineStatus(lastSeenAt: string | null, revokedAt: string | null) {
  if (revokedAt) return 'revoked'
  if (!lastSeenAt) return 'never'
  const diffMs = Date.now() - new Date(lastSeenAt).getTime()
  const diffMin = diffMs / 60000
  if (diffMin < 2) return 'online'
  if (diffMin < 10) return 'recent'
  return 'offline'
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Nunca'
  const diffMs = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 60) return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function OnlineBadge({
  lastSeenAt,
  revokedAt,
}: {
  lastSeenAt: string | null
  revokedAt: string | null
}) {
  const status = getOnlineStatus(lastSeenAt, revokedAt)
  if (status === 'revoked')
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-500">
        <ShieldOff className="h-3.5 w-3.5" /> Revocado
      </span>
    )
  if (status === 'online')
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
        </span>
        Online
      </span>
    )
  if (status === 'recent')
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-600">
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        Reciente
      </span>
    )
  if (status === 'never')
    return (
      <span className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        Sin conexión
      </span>
    )
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
      Offline
    </span>
  )
}

function PinModal({
  deviceId,
  deviceName,
  onClose,
}: {
  deviceId: string
  deviceName: string
  onClose: () => void
}) {
  const [pin, setPin] = useState('')
  const [mode, setMode] = useState<'set' | 'remove'>('set')
  const utils = trpc.useUtils()
  const setPin_ = trpc.admin.setDevicePin.useMutation({
    onSuccess: () => {
      utils.admin.listDevices.invalidate()
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-base font-semibold text-gray-900">PIN del dispositivo</h3>
        <p className="mb-4 text-sm text-gray-500">
          Dispositivo: <strong>{deviceName}</strong>. El usuario necesitará este PIN para pausar o
          cerrar el agente.
        </p>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('set')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === 'set' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            <Lock className="mr-1 inline h-3.5 w-3.5" /> Establecer PIN
          </button>
          <button
            type="button"
            onClick={() => setMode('remove')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            <Unlock className="mr-1 inline h-3.5 w-3.5" /> Quitar PIN
          </button>
        </div>
        {mode === 'set' && (
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="PIN numérico (4-12 dígitos)"
            maxLength={12}
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-center font-mono text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        {mode === 'remove' && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            El agente funcionará sin restricciones. El usuario podrá pausarlo o cerrarlo libremente.
          </div>
        )}
        {setPin_.error && <p className="mb-2 text-xs text-red-600">{setPin_.error.message}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={setPin_.isPending || (mode === 'set' && pin.length < 4)}
            onClick={() => setPin_.mutate({ deviceId, pin: mode === 'set' ? pin : null })}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {setPin_.isPending ? 'Guardando...' : mode === 'set' ? 'Aplicar PIN' : 'Quitar PIN'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DeviceManager() {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [enrollTarget, setEnrollTarget] = useState<{ userId: string; userName: string } | null>(
    null,
  )
  const [pinTarget, setPinTarget] = useState<{ id: string; name: string } | null>(null)

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.admin.listDevices.useQuery(
    { userId: selectedUserId, page, pageSize: 20 },
    { placeholderData: keepPreviousData, refetchInterval: 30000 },
  )
  const { data: users } = trpc.admin.listUsers.useQuery({
    role: 'all',
    status: 'active',
    page: 1,
    pageSize: 100,
  })

  const revoke = trpc.admin.revokeDevice.useMutation({
    onSuccess: () => utils.admin.listDevices.invalidate(),
  })
  const deleteDevice = trpc.admin.deleteDevice.useMutation({
    onSuccess: () => utils.admin.listDevices.invalidate(),
  })
  const genCode = trpc.admin.generateEnrollmentCode.useMutation()

  const handleGenCode = async (userId: string, userName: string) => {
    const result = await genCode.mutateAsync({ userId })
    setEnrollTarget({ userId, userName })
    setCopiedCode(result.code)
  }

  const copyCode = async () => {
    if (!copiedCode) return
    await navigator.clipboard.writeText(copiedCode)
  }

  return (
    <div className="space-y-4">
      {pinTarget && (
        <PinModal
          deviceId={pinTarget.id}
          deviceName={pinTarget.name}
          onClose={() => setPinTarget(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filtrar por usuario"
          value={selectedUserId ?? ''}
          onChange={(e) => {
            setSelectedUserId(e.target.value || undefined)
            setPage(1)
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los usuarios</option>
          {(users?.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.email}
            </option>
          ))}
        </select>
      </div>

      {/* Modal código enrolamiento */}
      {copiedCode && enrollTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-900">Código de enrolamiento</h3>
            <p className="mb-4 text-sm text-gray-500">
              Comparte este código con <strong>{enrollTarget.userName}</strong>. Expira en 15
              minutos.
            </p>
            <div className="flex items-center justify-between rounded-lg bg-gray-900 px-4 py-3">
              <span className="font-mono text-2xl tracking-widest text-white">{copiedCode}</span>
              <button onClick={copyCode} className="rounded p-1.5 text-gray-400 hover:text-white">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              El agente debe estar instalado en el dispositivo. El código solo puede usarse una vez.
            </div>
            <button
              onClick={() => {
                setCopiedCode(null)
                setEnrollTarget(null)
              }}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Tabla de dispositivos */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Dispositivo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Plataforma</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Último acceso</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
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
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Monitor className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-400">Sin dispositivos enrolados</p>
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((device) => {
              const user = (users?.data ?? []).find((u) => u.id === device.user_id)
              const isRevoked = !!device.revoked_at
              return (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{device.name}</p>
                    <p className="font-mono text-xs text-gray-400">{device.hostname}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {user?.full_name ?? user?.email ?? device.user_id.slice(0, 8) + '...'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium">
                      {(device.platform ? PLATFORM_LABELS[device.platform] : null) ??
                        device.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <span title={device.last_seen_at ? formatDate(device.last_seen_at) : 'Nunca'}>
                      {relativeTime(device.last_seen_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <OnlineBadge lastSeenAt={device.last_seen_at} revokedAt={device.revoked_at} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => setPinTarget({ id: device.id, name: device.name ?? '' })}
                          title="Configurar PIN de protección"
                          className="rounded bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `¿Revocar dispositivo "${device.name}"? El agente dejará de enviar datos.`,
                              )
                            ) {
                              revoke.mutate({ deviceId: device.id })
                            }
                          }}
                          disabled={revoke.isPending}
                          className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          Revocar
                        </button>
                      )}
                      {isRevoked && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `¿Eliminar permanentemente "${device.name}"? Esta acción no se puede deshacer.`,
                              )
                            ) {
                              deleteDevice.mutate({ deviceId: device.id })
                            }
                          }}
                          disabled={deleteDevice.isPending}
                          className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" /> Eliminar
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

      {/* Sección para generar códigos */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-blue-800">Generar código de enrolamiento</h3>
        <p className="mb-3 text-xs text-blue-600">
          Selecciona un usuario para generar un código de 8 caracteres válido por 15 minutos. El
          usuario lo ingresa en el agente instalado en su PC.
        </p>
        <div className="flex flex-wrap gap-2">
          {(users?.data ?? []).slice(0, 20).map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleGenCode(u.id, u.full_name ?? u.email)}
              disabled={genCode.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              {u.full_name ?? u.email}
            </button>
          ))}
        </div>
        {genCode.error && <p className="mt-2 text-xs text-red-600">{genCode.error.message}</p>}
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
    </div>
  )
}
