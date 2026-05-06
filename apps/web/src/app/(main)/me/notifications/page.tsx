'use client'

import { trpc } from '@/lib/trpc-client'
import { Bell, CheckCheck, AlertTriangle, Info, Zap, User } from 'lucide-react'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const SEVERITY_STYLES = {
  critical: 'border-l-4 border-red-400 bg-red-50',
  warning: 'border-l-4 border-amber-400 bg-amber-50',
  info: 'border-l-4 border-blue-400 bg-blue-50',
}

const SEVERITY_ICONS = {
  critical: AlertTriangle,
  warning: Zap,
  info: Info,
}

const SOURCE_LABELS = {
  alert: 'Alerta automática',
  manager: 'Mensaje del manager',
}

export default function NotificationsPage() {
  const utils = trpc.useUtils()

  const { data: all = [], isLoading } = trpc.notifications.getMyNotifications.useQuery({
    limit: 50,
  })

  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => void utils.notifications.getMyNotifications.invalidate(),
  })
  const markAll = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      void utils.notifications.getMyNotifications.invalidate()
      void utils.notifications.getUnreadCount.invalidate()
    },
  })

  const unread = all.filter((n) => !n.read_at)
  const read = all.filter((n) => n.read_at)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notificaciones</h1>
          <p className="mt-1 text-sm text-gray-500">
            {unread.length > 0 ? `${unread.length} sin leer` : 'Todo al día'}
          </p>
        </div>
        {unread.length > 0 && (
          <button
            type="button"
            title="Marcar todas como leídas"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && all.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 px-6 py-20 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-5">
            <Bell className="h-10 w-10 text-gray-300" />
          </div>
          <p className="text-base font-semibold text-gray-600">Sin notificaciones</p>
          <p className="mt-2 text-sm text-gray-400">
            Aquí aparecerán los mensajes de tu manager y alertas del sistema.
          </p>
        </div>
      )}

      {/* Sin leer */}
      {unread.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Sin leer
          </h2>
          <div className="space-y-2">
            {unread.map((n) => {
              const SeverityIcon = SEVERITY_ICONS[n.severity] ?? Info
              return (
                <div key={n.id} className={`rounded-xl p-4 ${SEVERITY_STYLES[n.severity]}`}>
                  <div className="flex items-start gap-3">
                    <SeverityIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{n.title}</p>
                          {n.body && <p className="mt-1 text-sm text-gray-700">{n.body}</p>}
                          {'sender_name' in n && n.sender_name && (
                            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-gray-600">
                              <User className="h-3 w-3" />
                              De: {n.sender_name}
                            </p>
                          )}
                          {n.subject_name && (
                            <p className="mt-1 text-xs text-gray-500">Usuario: {n.subject_name}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            {SOURCE_LABELS[n.source]}
                          </span>
                          <button
                            type="button"
                            title="Marcar como leída"
                            onClick={() => markAsRead.mutate({ ids: [n.id] })}
                            disabled={markAsRead.isPending}
                            className="text-xs text-gray-500 hover:underline disabled:opacity-50"
                          >
                            Marcar leída
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">{formatDate(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Leídas */}
      {read.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Leídas
          </h2>
          <div className="space-y-2">
            {read.map((n) => (
              <div key={n.id} className="rounded-xl border border-gray-100 bg-white p-4 opacity-70">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-700">{n.title}</p>
                        {n.body && <p className="mt-1 text-sm text-gray-500">{n.body}</p>}
                        {'sender_name' in n && n.sender_name && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                            <User className="h-3 w-3" />
                            De: {n.sender_name}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400">
                        {SOURCE_LABELS[n.source]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">{formatDate(n.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
