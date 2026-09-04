'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

/**
 * "¿Cómo va la empresa?" — la pregunta que el Resumen no respondía.
 *
 * Antes la primera franja del panel mostraba dispositivos, sesiones, usuarios y
 * última sincronización: inventario e infraestructura. Nada comparado contra lo
 * pactado, que es lo único que permite decir si la semana fue buena o mala.
 */

const hoy = () => new Date().toISOString().slice(0, 10)
const haceDias = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

function Grande({
  label,
  value,
  color,
  pie,
}: {
  label: string
  value: string
  color: string
  pie: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
      <div className="mt-1 text-xs text-gray-500">{pie}</div>
    </div>
  )
}

export function CompanySituation() {
  const desde = haceDias(6)
  const hasta = hoy()

  const { data, isLoading } = trpc.admin.getComplianceReport.useQuery({ from: desde, to: hasta })
  const { data: sinConsentimiento = [] } = trpc.admin.getMonitoringWithoutConsent.useQuery(
    undefined,
    { staleTime: 60_000 },
  )

  if (isLoading) {
    return <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
  }

  const t = data?.totals
  const gente = data?.people ?? []
  const conDatos = gente.length > 0

  // Productividad del equipo sobre el tiempo activo del período.
  const activo = gente.reduce((s, p) => s + p.activeSeconds, 0)
  const productivo = gente.reduce((s, p) => s + p.productiveSeconds, 0)
  const ratioProd = activo > 0 ? productivo / activo : null
  const sinClasificar = activo > 0 && productivo === 0

  // Delta promedio de quienes tienen período anterior con qué comparar.
  const conDelta = gente.filter((p) => p.delta !== null)
  const deltaProm =
    conDelta.length > 0 ? conDelta.reduce((s, p) => s + (p.delta ?? 0), 0) / conDelta.length : null

  const bajo = gente.filter((p) => p.complianceRatio !== null && p.complianceRatio < 0.8)
  const exceso = gente.filter((p) => p.complianceRatio !== null && p.complianceRatio > 1.1)

  const colorCumpl =
    !t || t.complianceRatio === null
      ? 'text-gray-400'
      : t.complianceRatio < 0.8
        ? 'text-red-600'
        : t.complianceRatio > 1.1
          ? 'text-orange-600'
          : 'text-green-700'

  const atencion = [
    ...bajo.map((p) => ({
      tipo: 'bajo' as const,
      texto: `${p.fullName} cumplió el ${Math.round((p.complianceRatio ?? 0) * 100)}% de su jornada`,
      href: '/admin/workday-compliance',
    })),
    ...exceso.map((p) => ({
      tipo: 'exceso' as const,
      texto: `${p.fullName} superó su jornada (${Math.round((p.complianceRatio ?? 0) * 100)}%)`,
      href: '/admin/metrics',
    })),
    ...sinConsentimiento.map((d) => ({
      tipo: 'consentimiento' as const,
      texto: `${d.fullName} es monitoreado sin haber aceptado la política`,
      href: '/admin/devices',
    })),
    ...(sinClasificar
      ? [
          {
            tipo: 'clasificacion' as const,
            texto: 'Ninguna aplicación está marcada como productiva: la productividad da 0%',
            href: '/admin/apps',
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Situación de la empresa</h2>
        <span className="text-[11px] text-gray-400">últimos 7 días</span>
      </div>

      {!conDatos ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
          Todavía no hay métricas en el período. Se calculan cada hora a partir de la actividad de
          los agentes.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Grande
            label="Cumplimiento de jornada"
            value={
              t?.complianceRatio === null ? '—' : `${Math.round((t!.complianceRatio ?? 0) * 100)}%`
            }
            color={colorCumpl}
            pie={
              deltaProm === null ? (
                <span className="text-gray-400">sin semana anterior para comparar</span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 ${deltaProm >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {deltaProm >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {deltaProm >= 0 ? '+' : ''}
                  {Math.round(deltaProm * 100)} pp vs. la semana anterior
                </span>
              )
            }
          />

          <Grande
            label="Productividad"
            value={ratioProd === null || sinClasificar ? '—' : `${Math.round(ratioProd * 100)}%`}
            color={sinClasificar ? 'text-gray-400' : 'text-gray-900'}
            pie={
              sinClasificar ? (
                <Link href="/admin/apps" className="text-blue-600 hover:underline">
                  Sin apps clasificadas — configurar catálogo
                </Link>
              ) : (
                <span className="text-gray-400">del tiempo con actividad</span>
              )
            }
          />

          <Grande
            label="Jornadas incompletas"
            value={String(t?.incompleteDays ?? 0)}
            color={(t?.incompleteDays ?? 0) > 0 ? 'text-orange-600' : 'text-green-700'}
            pie={
              <span className="text-gray-400">
                de {gente.reduce((s, p) => s + p.daysWithData, 0)} días registrados
              </span>
            }
          />
        </div>
      )}

      {/* Qué requiere atención: lo que convierte un panel en algo accionable. */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Requiere atención</h3>
        {atencion.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Nada pendiente: jornadas dentro de lo pactado y
            consentimientos al día.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {atencion.slice(0, 6).map((a, i) => (
              <li key={i}>
                <Link
                  href={a.href}
                  className="group flex items-center gap-2 text-sm text-gray-700 hover:text-blue-700"
                >
                  <AlertTriangle
                    className={`h-3.5 w-3.5 shrink-0 ${
                      a.tipo === 'consentimiento' ? 'text-red-500' : 'text-amber-500'
                    }`}
                  />
                  <span className="flex-1">{a.texto}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-gray-300 group-hover:text-blue-600" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
