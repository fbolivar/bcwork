'use client'

import { trpc } from '@/lib/trpc-client'

/** Horario asignado y aviso de desconexión digital: contexto, al final de la página. */
export function MyScheduleNotice() {
  const { data: schedule } = trpc.employee.getMySchedule.useQuery()
  const workdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const workdays = (schedule?.days_of_week ?? []) as number[]

  return (
    <div className="space-y-4">
      {/* Horario asignado */}
      {schedule && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Mi horario asignado</h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>
              Entrada: <strong>{schedule.start_time}</strong>
            </span>
            <span>
              Salida: <strong>{schedule.end_time}</strong>
            </span>
            <span>
              Horas semanales: <strong>{schedule.weekly_hours}h</strong>
            </span>
            {schedule.disconnection_grace_minutes > 0 && (
              <span className="text-amber-600">
                Desconexión: <strong>{schedule.disconnection_grace_minutes}min</strong> antes de
                salida
              </span>
            )}
          </div>
          <div className="mt-3 flex gap-1">
            {workdayLabels.map((day, i) => (
              <span
                key={day}
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  workdays.includes(i) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Aviso legal Ley 2191 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
        <strong>Derecho a la desconexión digital</strong> — Ley 2191/2022 te garantiza no ser
        contactado fuera de tu horario laboral. El monitoreo se pausa automáticamente al terminar tu
        jornada. Datos protegidos bajo Ley 1581/2012 (HABEAS DATA).
      </div>
    </div>
  )
}
