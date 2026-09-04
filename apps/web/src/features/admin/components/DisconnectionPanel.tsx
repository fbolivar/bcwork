'use client'

import { useState } from 'react'
import { MoonStar, Loader2, ShieldCheck } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

function hhmm(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.round((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/**
 * Desconexión laboral (Ley 2191 de 2022).
 *
 * El sujeto de este panel es la empresa, no el trabajador: la obligación de
 * garantizar la desconexión es del empleador. Por eso no se presenta como un
 * hallazgo sobre la persona sino como una exposición del empleador.
 */
export function DisconnectionPanel() {
  const [days, setDays] = useState(14)
  const { data = [], isLoading } = trpc.admin.getDisconnectionRisk.useQuery({ days })

  const totalPersonas = data.length
  const totalSegundos = data.reduce((s, r) => s + r.totalSeconds, 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MoonStar className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Desconexión laboral</h2>
          </div>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Actividad registrada fuera de la jornada: noches, madrugadas y fines de semana. La Ley
            2191 de 2022 obliga a la <strong>empresa</strong> a garantizar la desconexión, así que
            lo que aparece acá es exposición del empleador, no una falta del colaborador.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
        >
          <option value={7}>Últimos 7 días</option>
          <option value={14}>Últimos 14 días</option>
          <option value={30}>Últimos 30 días</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
        </div>
      ) : totalPersonas === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Sin actividad fuera de jornada en el período. La empresa no registra exposición.
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-900">
            <strong>
              {totalPersonas} {totalPersonas === 1 ? 'colaborador' : 'colaboradores'}
            </strong>{' '}
            con actividad fuera de jornada, {hhmm(totalSegundos)} en total.
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="pb-2 font-semibold">Colaborador</th>
                  <th className="pb-2 text-right font-semibold">Noche 20–24h</th>
                  <th className="pb-2 text-right font-semibold">Madrugada 0–6h</th>
                  <th className="pb-2 text-right font-semibold">Fin de semana</th>
                  <th className="pb-2 text-right font-semibold">Días</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.userId} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 font-medium text-gray-800">{r.fullName}</td>
                    <td className="py-2 text-right text-gray-600">
                      {r.nightSeconds > 0 ? hhmm(r.nightSeconds) : '—'}
                    </td>
                    <td className="py-2 text-right">
                      {r.earlyMorningSeconds > 0 ? (
                        <span className="font-semibold text-orange-600">
                          {hhmm(r.earlyMorningSeconds)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right text-gray-600">
                      {r.weekendSeconds > 0 ? hhmm(r.weekendSeconds) : '—'}
                    </td>
                    <td className="py-2 text-right text-gray-600">{r.daysAffected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            La madrugada se resalta porque es la franja más difícil de justificar ante una
            inspección. Estas cifras describen cuándo hubo actividad en el equipo; no prueban por sí
            solas que la empresa haya exigido el trabajo.
          </p>
        </>
      )}
    </div>
  )
}
