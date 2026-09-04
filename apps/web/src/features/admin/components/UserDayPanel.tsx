'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

const COLOR: Record<string, string> = {
  productive: '#0891b2',
  non_productive: '#f97316',
  neutral: '#cbd5e1',
}

function hhmm(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.round((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function horaLocal(iso: string, tz: string) {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/** Posición 0-1 dentro del día local, para ubicar el bloque en la franja. */
function fraccionDelDia(iso: string, tz: string) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso))
  const h = Number(p.find((x) => x.type === 'hour')?.value ?? 0) % 24
  const m = Number(p.find((x) => x.type === 'minute')?.value ?? 0)
  return (h * 60 + m) / 1440
}

function Metrica({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  )
}

export function UserDayPanel({
  userId,
  fullName,
  onClose,
}: {
  userId: string
  fullName: string
  onClose: () => void
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const { data, isLoading } = trpc.admin.getUserDayDetail.useQuery({ userId, date })

  const tz = data?.timezone ?? 'America/Bogota'
  const t = data?.totals

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="mt-8 w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{fullName}</h2>
            <p className="text-xs text-gray-500">Detalle del día · hora de {tz}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
            />
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : !data || data.events.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            Sin actividad registrada este día.
          </p>
        ) : (
          <>
            {/* Presencia vs actividad: sin esta distinción, cualquier porcentaje
                es una cifra sin respaldo. */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metrica
                label="Presencia"
                value={hhmm(t!.presence_seconds)}
                hint="equipo encendido"
              />
              <Metrica label="Activo" value={hhmm(t!.active_seconds)} hint="con interacción" />
              <Metrica label="Inactivo" value={hhmm(t!.idle_seconds)} hint="sin interacción" />
              <Metrica
                label="Productivo"
                value={hhmm(t!.productive_seconds)}
                hint={`${Math.round(t!.productivity_ratio * 100)}% de lo activo`}
              />
            </div>

            {t!.presence_seconds > 0 && (
              <div className="mt-3">
                <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="bg-cyan-500"
                    style={{ width: `${(t!.active_seconds / t!.presence_seconds) * 100}%` }}
                    title="Activo"
                  />
                  <div
                    className="bg-gray-300"
                    style={{ width: `${(t!.idle_seconds / t!.presence_seconds) * 100}%` }}
                    title="Inactivo"
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">
                  Activo vs inactivo sobre el tiempo con el equipo encendido
                </p>
              </div>
            )}

            {/* Franja del día */}
            <div className="mt-5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Franja del día
              </p>
              <div className="relative h-9 w-full overflow-hidden rounded-lg bg-gray-50">
                {data.events.map((e) => {
                  const left = fraccionDelDia(e.started_at, tz) * 100
                  const width = Math.max((e.duration_seconds / 86400) * 100, 0.25)
                  return (
                    <div
                      key={e.id}
                      className="absolute top-0 h-full"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: COLOR[e.productivity] ?? COLOR.neutral,
                        opacity: 0.9,
                      }}
                      title={`${horaLocal(e.started_at, tz)} · ${e.app_identifier ?? 'sin app'} · ${hhmm(e.duration_seconds)}`}
                    />
                  )
                })}
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-gray-400">
                {['00', '06', '12', '18', '24'].map((h) => (
                  <span key={h}>{h}:00</span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                {(
                  [
                    ['productive', 'Productivo'],
                    ['non_productive', 'No productivo'],
                    ['neutral', 'Neutral / sin clasificar'],
                  ] as const
                ).map(([k, label]) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-sm"
                      style={{ background: COLOR[k] }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Sesiones */}
            {data.sessions.length > 0 && (
              <div className="mt-5">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Sesiones ({data.sessions.length})
                </p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {data.sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-1.5 text-xs"
                    >
                      <span className="font-medium text-gray-700">
                        {horaLocal(s.started_at, tz)}
                        {s.ended_at ? ` – ${horaLocal(s.ended_at, tz)}` : ' – en curso'}
                      </span>
                      <span className="text-gray-500">
                        {hhmm(s.active_seconds)} activo · {hhmm(s.idle_seconds)} inactivo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
