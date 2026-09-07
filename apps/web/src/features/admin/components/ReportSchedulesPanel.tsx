'use client'

import { useState } from 'react'
import { trpc as api } from '@/lib/trpc-client'
import { Mail, Plus, Trash2, Send, Clock, X } from 'lucide-react'
import { describirFrecuencia } from '@/server/report-schedule'

/**
 * Programación de informes por correo.
 *
 * La tabla existía desde el esquema inicial pero no había forma de crear una
 * programación ni nada que la enviara. Esta pantalla cierra la mitad de
 * entrada; el envío lo hace /api/cron/scheduled-reports cada hora.
 */

type TipoInforme = 'overview' | 'attendance' | 'productivity' | 'absences' | 'payroll'

const TIPOS: { value: TipoInforme; label: string }[] = [
  { value: 'overview', label: 'Resumen general' },
  { value: 'attendance', label: 'Asistencia' },
  { value: 'productivity', label: 'Productividad' },
  { value: 'absences', label: 'Ausencias' },
  { value: 'payroll', label: 'Nómina' },
]

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/**
 * El tipo inferido de `select('*')` sobre scheduled_reports es lo bastante
 * profundo para que TypeScript se rinda (TS2589) al recorrer la lista. Se fija
 * aquí la forma que esta pantalla realmente usa.
 */
interface Programacion {
  id: string
  name: string
  report_type: string
  cron_expression: string
  recipients: string[] | null
  is_active: boolean | null
  next_run_at: string | null
}

type Frecuencia =
  | { tipo: 'diaria'; hora: number; minuto: number }
  | { tipo: 'semanal'; hora: number; minuto: number; diaSemana: number }
  | { tipo: 'mensual'; hora: number; minuto: number; diaMes: number }

export function ReportSchedulesPanel() {
  const utils = api.useUtils()
  const { data, isLoading } = api.admin.listReportTemplates.useQuery()
  const programaciones = (data ?? []) as unknown as Programacion[]

  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoInforme>('overview')
  const [periodicidad, setPeriodicidad] = useState<'diaria' | 'semanal' | 'mensual'>('semanal')
  const [hora, setHora] = useState('07:00')
  const [diaSemana, setDiaSemana] = useState(1)
  const [diaMes, setDiaMes] = useState(1)
  const [destinatarios, setDestinatarios] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const refrescar = () => void utils.admin.listReportTemplates.invalidate()

  const guardar = api.admin.upsertReportSchedule.useMutation({
    onSuccess: () => {
      setAbierto(false)
      setNombre('')
      setDestinatarios('')
      setError(null)
      refrescar()
    },
    onError: (e) => setError(e.message),
  })
  const borrar = api.admin.deleteReportSchedule.useMutation({ onSuccess: refrescar })
  const activar = api.admin.setReportScheduleActive.useMutation({ onSuccess: refrescar })
  const enviarYa = api.admin.sendReportScheduleNow.useMutation({
    onSuccess: (r) => {
      setAviso(`Enviado a ${r.enviados} destinatario${r.enviados === 1 ? '' : 's'}.`)
      refrescar()
    },
    onError: (e) => setAviso(`No se pudo enviar: ${e.message}`),
  })

  function enviar() {
    const correos = destinatarios
      .split(/[,;\s]+/)
      .map((c) => c.trim())
      .filter(Boolean)
    if (correos.length === 0) {
      setError('Indicá al menos un destinatario.')
      return
    }
    const [h, m] = hora.split(':').map(Number)
    const base = { hora: h ?? 7, minuto: m ?? 0 }
    const frecuencia: Frecuencia =
      periodicidad === 'diaria'
        ? { tipo: 'diaria', ...base }
        : periodicidad === 'semanal'
          ? { tipo: 'semanal', ...base, diaSemana }
          : { tipo: 'mensual', ...base, diaMes }

    guardar.mutate({
      name: nombre.trim() || TIPOS.find((t) => t.value === tipo)!.label,
      report_type: tipo,
      frecuencia,
      recipients: correos,
      is_active: true,
    })
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">Envío automático por correo</p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          {abierto ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {abierto ? 'Cancelar' : 'Programar informe'}
        </button>
      </div>

      {abierto && (
        <div className="space-y-3 border-b border-gray-50 bg-gray-50/60 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Productividad semanal de Operaciones"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Informe</label>
              <select
                value={tipo}
                title="Tipo de informe"
                onChange={(e) => setTipo(e.target.value as TipoInforme)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Frecuencia</label>
              <select
                value={periodicidad}
                title="Frecuencia"
                onChange={(e) => setPeriodicidad(e.target.value as typeof periodicidad)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              >
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
            {periodicidad === 'semanal' && (
              <div>
                <label className="mb-1 block text-xs text-gray-500">Día</label>
                <select
                  value={diaSemana}
                  title="Día de la semana"
                  onChange={(e) => setDiaSemana(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                >
                  {DIAS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {periodicidad === 'mensual' && (
              <div>
                <label className="mb-1 block text-xs text-gray-500">Día del mes</label>
                <select
                  value={diaMes}
                  title="Día del mes"
                  onChange={(e) => setDiaMes(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                >
                  {/* Hasta 28: los días 29 a 31 no existen todos los meses y el
                      envío se saltaría febrero sin avisar. */}
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs text-gray-500">Hora</label>
              <input
                type="time"
                value={hora}
                title="Hora de envío"
                onChange={(e) => setHora(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Destinatarios (separados por coma)
            </label>
            <input
              value={destinatarios}
              onChange={(e) => setDestinatarios(e.target.value)}
              placeholder="gerencia@empresa.com, rrhh@empresa.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>

          <p className="text-[11px] text-gray-400">
            El informe cubre siempre períodos cerrados y termina el día anterior al envío, para que
            ninguna cifra llegue a medias.
          </p>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={enviar}
            disabled={guardar.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {guardar.isPending ? 'Guardando…' : 'Guardar programación'}
          </button>
        </div>
      )}

      {aviso && (
        <p className="border-b border-gray-50 bg-blue-50 px-5 py-2 text-xs text-blue-700">
          {aviso}
        </p>
      )}

      {isLoading ? (
        <div className="h-20 animate-pulse bg-gray-50" />
      ) : !programaciones.length ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400">
          No hay informes programados. Los que crees acá se envían solos por correo.
        </p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {programaciones.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{p.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
                  <span>
                    {TIPOS.find((t) => t.value === p.report_type)?.label ?? p.report_type}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {describirFrecuencia(p.cron_expression)}
                  </span>
                  <span>·</span>
                  <span>{p.recipients?.length ?? 0} destinatario(s)</span>
                  {p.next_run_at && (
                    <>
                      <span>·</span>
                      <span>
                        próximo {new Date(p.next_run_at).toLocaleString('es-CO', { hour12: false })}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <input
                  type="checkbox"
                  checked={p.is_active ?? false}
                  onChange={(e) => activar.mutate({ id: p.id, is_active: e.target.checked })}
                />
                Activo
              </label>

              <button
                type="button"
                onClick={() => {
                  setAviso(null)
                  enviarYa.mutate({ id: p.id })
                }}
                disabled={enviarYa.isPending}
                title="Enviar ahora sin alterar el calendario"
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                Enviar ahora
              </button>

              <button
                type="button"
                onClick={() => borrar.mutate({ id: p.id })}
                title="Eliminar programación"
                className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
