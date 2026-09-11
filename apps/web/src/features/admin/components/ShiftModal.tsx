'use client'

import { useState } from 'react'
import { X, ChevronDown, Check } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

/**
 * "Crear un horario": un turno asignado a equipos o personas, con fechas,
 * lugar de trabajo, horas mínimas, repetición y la opción de guardarlo como
 * plantilla. Por debajo es una plantilla (work_schedules) más una asignación
 * por persona (user_schedules), así que el cumplimiento y las alertas de
 * desconexión funcionan igual que siempre.
 */

const input =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100'
const label = 'mb-1 block text-xs font-medium text-gray-600'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function hoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Opciones de hora cada 30 min, como en la referencia. */
const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})
const MINIMAS = Array.from({ length: 24 }, (_, i) => (i + 1) / 2) // 0.5 … 12

function MultiSelect({
  opciones,
  valor,
  onChange,
  placeholder,
}: {
  opciones: { id: string; nombre: string }[]
  valor: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [abierto, setAbierto] = useState(false)
  const elegidos = opciones.filter((o) => valor.includes(o.id))
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`${input} flex items-center justify-between text-left`}
      >
        <span className={`truncate ${elegidos.length ? 'text-gray-800' : 'text-gray-400'}`}>
          {elegidos.length === 0
            ? placeholder
            : elegidos.length <= 2
              ? elegidos.map((e) => e.nombre).join(', ')
              : `${elegidos.length} seleccionados`}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>
      {abierto && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          {opciones.length === 0 && (
            <p className="px-2 py-2 text-xs text-gray-400">No hay opciones.</p>
          )}
          {opciones.map((o) => {
            const on = valor.includes(o.id)
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange(on ? valor.filter((x) => x !== o.id) : [...valor, o.id])}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${on ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                {o.nombre}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ShiftModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils()
  const { data: equipos } = trpc.admin.listTeams.useQuery({ pageSize: 100 })
  const { data: plantilla } = trpc.admin.listUsers.useQuery({ pageSize: 100 })
  const { data: plantillas } = trpc.admin.listSchedules.useQuery()

  const personas = (
    (plantilla?.data ?? []) as { id: string; full_name: string | null; email: string }[]
  ).map((u) => ({ id: u.id, nombre: u.full_name || u.email }))
  const equiposOpc = (equipos?.data ?? []).map((t) => ({ id: t.id, nombre: t.name }))

  const hoy = hoyLocal()
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [userIds, setUserIds] = useState<string[]>([])
  const [descripcion, setDescripcion] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [workFrom, setWorkFrom] = useState<'office' | 'remote' | 'hybrid'>('office')
  const [startDate, setStartDate] = useState(hoy)
  const [endDate, setEndDate] = useState(hoy)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('18:00')
  const [minHours, setMinHours] = useState(8)
  const [repetir, setRepetir] = useState(false)
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5])
  const [guardarPlantilla, setGuardarPlantilla] = useState(false)
  const [nombrePlantilla, setNombrePlantilla] = useState('')
  const [error, setError] = useState('')

  const crear = trpc.admin.createShift.useMutation({
    onSuccess: () => {
      void utils.admin.listShifts.invalidate()
      void utils.admin.listSchedules.invalidate()
      void utils.admin.getScheduleAssignments.invalidate()
      onClose()
    },
    onError: (e) => setError(e.message),
  })

  function elegirPlantilla(id: string) {
    setTemplateId(id)
    const t = (plantillas ?? []).find((p) => p.id === id)
    if (!t) return
    if (t.start_time) setStartTime(t.start_time.slice(0, 5))
    if (t.end_time) setEndTime(t.end_time.slice(0, 5))
    if (t.min_daily_hours) setMinHours(Number(t.min_daily_hours))
    else if (t.weekly_hours && t.days_of_week?.length)
      setMinHours(Math.round((t.weekly_hours / t.days_of_week.length) * 2) / 2)
    if (t.work_from) setWorkFrom(t.work_from as 'office' | 'remote' | 'hybrid')
    if (t.days_of_week?.length) {
      setDias(t.days_of_week)
      setRepetir(true)
    }
  }

  function guardar() {
    setError('')
    if (teamIds.length === 0 && userIds.length === 0) {
      setError('Elegí al menos un equipo o una persona.')
      return
    }
    crear.mutate({
      team_ids: teamIds,
      user_ids: userIds,
      description: descripcion.trim() || undefined,
      template_id: templateId || null,
      work_from: workFrom,
      start_date: startDate,
      end_date: repetir ? startDate : endDate,
      start_time: startTime,
      end_time: endTime,
      min_hours: minHours,
      repeat: repetir,
      days_of_week: repetir ? dias : undefined,
      save_as_template: guardarPlantilla,
      template_name: guardarPlantilla ? nombrePlantilla.trim() || undefined : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Crear un horario</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-700">Asignar a</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Equipos</label>
                <MultiSelect
                  opciones={equiposOpc}
                  valor={teamIds}
                  onChange={setTeamIds}
                  placeholder="Seleccionar equipos"
                />
              </div>
              <div>
                <label className={label}>Miembros</label>
                <MultiSelect
                  opciones={personas}
                  valor={userIds}
                  onChange={setUserIds}
                  placeholder="Seleccionar miembros"
                />
              </div>
            </div>
          </div>

          <div>
            <label className={label}>Descripción</label>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles del turno"
              className={input}
            />
          </div>

          <div>
            <label className={label}>Plantilla de horario</label>
            <select
              value={templateId}
              onChange={(e) => elegirPlantilla(e.target.value)}
              className={input}
              title="Plantilla de horario"
            >
              <option value="">Seleccionar plantilla</option>
              {(plantillas ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.start_time && p.end_time
                    ? ` · ${p.start_time.slice(0, 5)}–${p.end_time.slice(0, 5)}`
                    : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">
              Al elegir una plantilla se copian sus horas y alertas. Podés cambiarlas para este
              turno.
            </p>
          </div>

          <div>
            <label className={label}>Trabajo desde</label>
            <select
              value={workFrom}
              onChange={(e) => setWorkFrom(e.target.value as typeof workFrom)}
              className={input}
              title="Trabajo desde"
            >
              <option value="office">Oficina</option>
              <option value="remote">Remoto</option>
              <option value="hybrid">Híbrido</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Inicio de turno</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (endDate < e.target.value) setEndDate(e.target.value)
                }}
                className={input}
                title="Fecha de inicio"
              />
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`${input} mt-2`}
                title="Hora de inicio"
              >
                {HORAS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Fin de turno</label>
              <input
                type="date"
                value={repetir ? startDate : endDate}
                min={startDate}
                disabled={repetir}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${input} disabled:bg-gray-50 disabled:text-gray-400`}
                title="Fecha de fin"
              />
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`${input} mt-2`}
                title="Hora de fin"
              >
                {HORAS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Horas mínimas</label>
            <select
              value={minHours}
              onChange={(e) => setMinHours(Number(e.target.value))}
              className={input}
              title="Horas mínimas por día"
            >
              {MINIMAS.map((h) => (
                <option key={h} value={h}>
                  {String(Math.floor(h)).padStart(2, '0')}:{h % 1 ? '30' : '00'}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">
              Por día. Es la jornada contra la que se mide el cumplimiento.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={repetir}
                onChange={(e) => setRepetir(e.target.checked)}
              />
              Repetir turno
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={guardarPlantilla}
                onChange={(e) => setGuardarPlantilla(e.target.checked)}
              />
              Guardar como plantilla
            </label>
          </div>

          {repetir && (
            <div>
              <label className={label}>Se repite cada semana los días</label>
              <div className="flex gap-1.5">
                {DIAS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setDias((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i].sort()))
                    }
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      dias.includes(i)
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                Desde la fecha de inicio, sin fecha de fin, hasta que se asigne otro horario.
              </p>
            </div>
          )}

          {guardarPlantilla && (
            <div>
              <label className={label}>Nombre de la plantilla</label>
              <input
                value={nombrePlantilla}
                onChange={(e) => setNombrePlantilla(e.target.value)}
                placeholder="Turno diurno oficina"
                className={input}
              />
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={crear.isPending}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {crear.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
