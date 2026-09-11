'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Clock, Zap, Coffee, LogIn, LogOut } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export function MyDayPanel() {
  const utils = trpc.useUtils()
  const { data: session, refetch: refetchSession } = trpc.employee.getActiveSession.useQuery()
  const { data: manualSession, refetch: refetchManual } =
    trpc.employee.getMyManualSession.useQuery()

  const checkin = trpc.employee.manualCheckin.useMutation({
    onSuccess: () => {
      void refetchManual()
      void refetchSession()
      void utils.employee.getTodayActivity.invalidate()
    },
  })
  const checkout = trpc.employee.manualCheckout.useMutation({
    onSuccess: () => {
      void refetchManual()
      void refetchSession()
      void utils.employee.getTodayActivity.invalidate()
    },
  })

  // Reloj en vivo
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
      void refetchSession()
    }, 15000)
    return () => clearInterval(id)
  }, [refetchSession])

  const elapsedSecs = session
    ? Math.round((now - new Date(session.started_at).getTime()) / 1000)
    : 0

  return (
    <div className="space-y-6">
      {/* Sesión activa */}
      <div
        className={`rounded-2xl p-6 ${session ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white'}`}
      >
        {session ? (
          <div>
            <div className="flex items-center gap-2 text-blue-200">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-300" />
              <span className="text-sm">Sesión activa</span>
            </div>
            <p className="mt-3 text-5xl font-bold tabular-nums">{fmtHours(elapsedSecs)}</p>
            <p className="mt-1 text-sm text-blue-200">desde las {fmtTime(session.started_at)}</p>
            <div className="mt-4 flex gap-6 text-sm">
              <span className="flex items-center gap-1.5 text-blue-100">
                <Zap className="h-4 w-4" />
                {fmtHours(session.active_seconds ?? 0)} activo
              </span>
              <span className="flex items-center gap-1.5 text-blue-200">
                <Coffee className="h-4 w-4" />
                {fmtHours(session.idle_seconds ?? 0)} inactivo
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-500">
            <Clock className="h-6 w-6 text-gray-300" />
            <div>
              <p className="font-medium text-gray-700">Sin sesión activa</p>
              <p className="text-sm">El agente iniciará la sesión cuando te pongas a trabajar</p>
            </div>
          </div>
        )}
      </div>

      {/* Check-in / Check-out manual — solo visible si no hay sesión activa del agente */}
      {!session && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Check-in manual</h3>
          {manualSession ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">
                  Sesión manual activa desde las{' '}
                  <strong>{fmtTime(manualSession.started_at)}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => checkout.mutate({ session_id: manualSession.id })}
                disabled={checkout.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {checkout.isPending ? 'Registrando salida…' : 'Registrar salida'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                El agente no está activo. Puedes registrar tu entrada manualmente para que quede
                constancia de tu jornada.
              </p>
              <button
                type="button"
                onClick={() => checkin.mutate()}
                disabled={checkin.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                {checkin.isPending ? 'Registrando…' : 'Registrar entrada'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
