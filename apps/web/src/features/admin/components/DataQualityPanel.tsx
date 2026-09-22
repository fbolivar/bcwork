'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { ShieldCheck, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'

/**
 * TI › Calidad de datos: por equipo, si lo que llega ese día es creíble.
 * Muestras duplicadas, extensión del navegador, latido, versión, sesiones
 * abiertas e inactividad imposible. Es lo que hay que mirar antes de mostrar
 * un informe a alguien.
 */

function hoyLocal() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

function masDias(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function hace(iso: string | null) {
  if (!iso) return '—'
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 48 * 60) return `hace ${Math.round(min / 60)} h`
  return `hace ${Math.round(min / 1440)} d`
}

function hora(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : '—'
}

export function DataQualityPanel() {
  const [date, setDate] = useState(hoyLocal())
  const { data, isLoading } = trpc.admin.getDataQuality.useQuery({ date })
  const equipos = data?.devices ?? []
  const conProblemas = equipos.filter((d) => d.problems.length > 0)
  const activos = equipos.filter((d) => d.samples > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Calidad de datos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Qué tan confiable es lo que reportó cada equipo ese día. Revísalo antes de leer un
            informe.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-gray-300 bg-white">
          <button
            type="button"
            onClick={() => setDate(masDias(date, -1))}
            className="px-2 py-2 text-gray-500 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={date}
            max={hoyLocal()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="border-0 bg-transparent px-2 py-2 text-sm focus:ring-0"
          />
          <button
            type="button"
            onClick={() => setDate(masDias(date, 1))}
            disabled={date >= hoyLocal()}
            className="px-2 py-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Cifra titulo="Equipos" valor={String(equipos.length)} />
        <Cifra titulo="Con datos ese día" valor={String(activos.length)} />
        <Cifra
          titulo="Con problemas"
          valor={String(conProblemas.length)}
          tono={conProblemas.length ? 'mal' : 'ok'}
        />
        <Cifra titulo="Versión vigente del agente" valor={data?.latestVersion ?? '—'} />
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[980px] text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3 font-semibold">Equipo</th>
                <th className="px-3 py-3 font-semibold">Persona</th>
                <th className="px-3 py-3 font-semibold">Agente</th>
                <th className="px-3 py-3 font-semibold">Latido</th>
                <th
                  className="px-3 py-3 text-right font-semibold"
                  title="Primera y última muestra del día"
                >
                  Actividad
                </th>
                <th
                  className="px-3 py-3 text-right font-semibold"
                  title="Muestras de 10 s recibidas × 10 s"
                >
                  Horas
                </th>
                <th
                  className="px-3 py-3 text-right font-semibold"
                  title="Muestras que cayeron en el mismo intervalo de 10 s que otra: dos capturadores a la vez"
                >
                  Duplicadas
                </th>
                <th
                  className="px-3 py-3 text-right font-semibold"
                  title="Muestras de navegador que traen el sitio: mide si la extensión está instalada y activa"
                >
                  Sitios web
                </th>
                <th
                  className="px-3 py-3 text-right font-semibold"
                  title="Sesiones del día sin cerrar"
                >
                  Sesiones
                </th>
                <th className="px-3 py-3 text-right font-semibold">Inactivo</th>
                <th className="px-3 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {equipos.map((d) => (
                <tr key={d.deviceId} className="border-b border-gray-100 align-top">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{d.hostname || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-700">
                    {d.person ?? <span className="text-gray-400">sin asignar</span>}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-gray-700">{d.version ?? '—'}</td>
                  <td className="px-3 py-2.5 text-gray-700">{hace(d.lastSeenAt)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                    {d.samples > 0 ? `${hora(d.firstAt)} – ${hora(d.lastAt)}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                    {d.samples > 0 ? `${d.hours} h` : '—'}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right tabular-nums ${d.duplicatePct > 2 ? 'font-semibold text-red-600' : 'text-gray-700'}`}
                  >
                    {d.samples > 0 ? `${d.duplicatePct} %` : '—'}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right tabular-nums ${d.browserDomainPct !== null && d.browserDomainPct < 50 ? 'text-orange-600' : 'text-gray-700'}`}
                  >
                    {d.browserDomainPct === null ? '—' : `${d.browserDomainPct} %`}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right tabular-nums ${d.openSessions > 1 ? 'text-red-600' : 'text-gray-700'}`}
                  >
                    {d.openSessions > 0
                      ? `${d.openSessions} abierta${d.openSessions > 1 ? 's' : ''}`
                      : '—'}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right tabular-nums ${d.idleHours > 12 ? 'text-red-600' : 'text-gray-700'}`}
                  >
                    {d.idleHours > 0 ? `${d.idleHours} h` : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {d.problems.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {d.samples > 0 ? 'Confiable' : 'Sin datos'}
                      </span>
                    ) : (
                      <ul className="space-y-0.5">
                        {d.problems.map((p) => (
                          <li key={p} className="inline-flex items-center gap-1 text-red-700">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
              {equipos.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-500">
                    No hay equipos inscritos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
        <p className="font-medium text-gray-800">Cómo leerlo</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>
            <strong>Duplicadas</strong>: debe ser 0 %. Si sube, hay dos capturadores en el equipo y
            las horas salen dobles; el agente 0.1.11 lo impide y el servidor descarta el sobrante.
          </li>
          <li>
            <strong>Sitios web</strong>: porcentaje de las muestras de Chrome/Edge que traen el
            dominio. Bajo 50 % la extensión no está activa en ese navegador.
          </li>
          <li>
            <strong>Sesiones</strong> e <strong>inactivo</strong>: más de una sesión abierta o más
            de 12 h inactivas en un día son datos rotos, no comportamiento.
          </li>
        </ul>
      </div>
    </div>
  )
}

function Cifra({
  titulo,
  valor,
  tono = 'neutro',
}: {
  titulo: string
  valor: string
  tono?: 'ok' | 'mal' | 'neutro'
}) {
  const color = tono === 'ok' ? 'text-green-600' : tono === 'mal' ? 'text-red-600' : 'text-gray-900'
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{valor}</p>
    </div>
  )
}
