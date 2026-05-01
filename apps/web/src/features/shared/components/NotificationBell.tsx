'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, X, Check } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { formatDate } from '@/lib/format'

const SEVERITY_STYLES = {
  critical: 'border-l-4 border-red-500 bg-red-50',
  warning: 'border-l-4 border-amber-400 bg-amber-50',
  info: 'border-l-4 border-blue-400 bg-blue-50',
}

const SEVERITY_DOT = {
  critical: 'bg-red-500',
  warning: 'bg-amber-400',
  info: 'bg-blue-400',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: countData, refetch: refetchCount } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    { refetchInterval: 60000 },
  )
  const {
    data: notifications,
    isLoading,
    refetch: refetchList,
  } = trpc.notifications.getMyNotifications.useQuery({ limit: 20 }, { enabled: open })

  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      void refetchCount()
      void refetchList()
    },
  })
  const markAll = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      void refetchCount()
      void refetchList()
    },
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unread = countData?.count ?? 0

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-700">Notificaciones</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
                >
                  <Check className="h-3 w-3" /> Marcar todas
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)}>
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : (notifications ?? []).length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">Sin notificaciones</div>
            ) : (
              <div className="space-y-1 p-2">
                {(notifications ?? []).map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg p-3 text-xs ${SEVERITY_STYLES[n.severity]} ${!n.read_at ? 'opacity-100' : 'opacity-60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[n.severity]}`}
                        />
                        <div>
                          <p className="font-semibold text-gray-800">{n.title}</p>
                          <p className="mt-0.5 text-gray-600">{n.body}</p>
                          {n.subject_name && (
                            <p className="mt-0.5 text-gray-400">Usuario: {n.subject_name}</p>
                          )}
                          <p className="mt-1 text-gray-400">{formatDate(n.created_at)}</p>
                        </div>
                      </div>
                      {!n.read_at && (
                        <button
                          type="button"
                          onClick={() => markAsRead.mutate({ ids: [n.id] })}
                          className="shrink-0 rounded p-0.5 hover:bg-white/60"
                        >
                          <Check className="h-3 w-3 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
