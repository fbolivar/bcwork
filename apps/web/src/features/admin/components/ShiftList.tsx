'use client'

import { CalendarDays, MapPin, Building2, Shuffle, X } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { iniciales } from './panel-identidad'

/** Turnos vigentes y futuros: quién, cuándo, desde dónde. */

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function fecha(iso: string | null) {
  if (!iso) return 'sin fin'
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function Lugar({ v }: { v: string | null }) {
  if (v === 'remote')
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <MapPin className="h-3.5 w-3.5" /> Remoto
      </span>
    )
  if (v === 'hybrid')
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Shuffle className="h-3.5 w-3.5" /> Híbrido
      </span>
    )
  if (v === 'office')
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Building2 className="h-3.5 w-3.5" /> Oficina
      </span>
    )
  return <span className="text-xs text-gray-300">–</span>
}

export function ShiftList() {
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.admin.listShifts.useQuery()
  const terminar = trpc.admin.endShift.useMutation({
    onSuccess: () => {
      void utils.admin.listShifts.invalidate()
      void utils.admin.getScheduleAssignments.invalidate()
    },
  })

  if (isLoading) return <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
  if (!data?.length) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 py-10">
        <CalendarDays className="mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-400">Nadie tiene un horario asignado todavía.</p>
      </div>
    )
  }

  const th =
    'px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400'
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className={th}>Persona</th>
            <th className={th}>Horario</th>
            <th className={th}>Turno</th>
            <th className={th}>Días</th>
            <th className={th}>Vigencia</th>
            <th className={th}>Desde</th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {data.map((s) => (
            <tr
              key={`${s.user_id}-${s.schedule_id}-${s.effective_from}`}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
            >
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                    {iniciales(s.user_name)}
                  </span>
                  <span className="text-gray-800">{s.user_name}</span>
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-700">
                {s.schedule_name}
                {!s.is_template && (
                  <span className="ml-2 rounded-full bg-gray-100 px-1.5 text-[10px] text-gray-500">
                    puntual
                  </span>
                )}
                {s.note && <p className="text-[11px] text-gray-400">{s.note}</p>}
              </td>
              <td className="px-4 py-2.5 tabular-nums text-gray-700">
                {s.start_time && s.end_time ? `${s.start_time}–${s.end_time}` : '—'}
                {s.min_daily_hours && (
                  <span className="ml-1 text-[11px] text-gray-400">
                    · mín {s.min_daily_hours} h
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <span className="flex gap-0.5">
                  {DIAS.map((d, i) => (
                    <span
                      key={i}
                      className={`h-5 w-5 rounded text-center text-[10px] leading-5 ${
                        s.days_of_week.includes(i)
                          ? 'bg-blue-100 font-semibold text-blue-700'
                          : 'text-gray-300'
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-600">
                {fecha(s.effective_from)} → {fecha(s.effective_to)}
              </td>
              <td className="px-4 py-2.5">
                <Lugar v={s.work_from} />
              </td>
              <td className="px-4 py-2.5">
                <button
                  type="button"
                  title="Terminar este turno hoy"
                  onClick={() => {
                    if (window.confirm(`¿Terminar el turno de ${s.user_name} desde hoy?`))
                      terminar.mutate({
                        user_id: s.user_id,
                        schedule_id: s.schedule_id,
                        effective_from: s.effective_from,
                      })
                  }}
                  className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
