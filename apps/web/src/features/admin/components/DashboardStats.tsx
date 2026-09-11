'use client'

import dynamic from 'next/dynamic'
import { trpc } from '@/lib/trpc-client'
import { Monitor, ShieldCheck, Zap } from 'lucide-react'
import { CompanySituation } from './CompanySituation'
import { CompanyInsights } from './CompanyInsights'
import { DayOverview } from './DayOverview'

const GeoLocationWidget = dynamic(
  () =>
    import('@/features/manager/components/GeoLocationWidget').then((m) => ({
      default: m.GeoLocationWidget,
    })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-gray-100" /> },
)

// ── Utility Card ──────────────────────────────────────────────────────────────

function UtilCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="rounded-lg p-2.5" style={{ background: color + '15', color }}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold tabular-nums text-gray-900">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardStats() {
  const stats = trpc.admin.getStats.useQuery(undefined, { refetchInterval: 60_000 })
  const snap = trpc.admin.getTeamSnapshot.useQuery(undefined, { refetchInterval: 30_000 })
  const { data: geoLocations = [] } = trpc.manager.getTeamGeoLocations.useQuery()
  const { data: me } = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60 * 1000 })
  const { data: consentPendientes = [] } = trpc.admin.getMonitoringWithoutConsent.useQuery(
    undefined,
    { staleTime: 60_000 },
  )

  const now = new Date()
  const hour = now.getHours()
  const saludo = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
  const rawName = me?.full_name?.trim().split(/\s+/)[0]
  const firstName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : undefined
  const greeting = firstName ? `${saludo}, ${firstName}` : saludo
  const dateStr = now.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const isLoading = stats.isLoading || snap.isLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-52 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-52 animate-pulse rounded-xl bg-gray-100" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  const d = stats.data
  const s = snap.data
  const onlineTotal = (s?.active ?? 0) + (s?.passive ?? 0)

  const licenseLabel =
    d?.licenseStatus === 'trial'
      ? 'trial activo'
      : d?.licenseStatus === 'active'
        ? 'licencia activa'
        : 'sin licencia'

  const seatsUsed = d?.activeUsers ?? 0
  const seatsTotal = d?.licenseSeats ?? 0
  const seatsPct = seatsTotal > 0 ? Math.round((seatsUsed / seatsTotal) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
          <p className="mt-0.5 text-sm capitalize text-gray-400">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-700">
            {onlineTotal} dispositivo{onlineTotal !== 1 ? 's' : ''} en línea
          </span>
        </div>
      </div>

      {/* El día, de un vistazo: quién llegó, quién no, en qué se va el tiempo
          y quién está haciendo qué ahora. Es la pregunta que trae quien abre
          el panel; todo lo demás es contexto. */}
      <DayOverview />

      {/* La semana contra el horario pactado y lo que requiere atención. */}
      <CompanySituation />

      {/* Tendencia de un mes: si la semana fue mejor o peor que las anteriores. */}
      <CompanyInsights />

      {/* Estado operativo, compacto. Antes había cuatro tarjetas grandes de
          inventario y un bloque de "estado del equipo" que repetía la primera;
          el número de equipos en línea ya vive en la píldora del encabezado. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-500">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">Licencia</p>
              <p className="text-xl font-bold text-gray-900">
                {seatsUsed} / {seatsTotal}
              </p>
              <p className="text-xs text-gray-400">{licenseLabel}</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100">
            <div
              className={`h-1.5 rounded-full transition-all ${seatsPct >= 90 ? 'bg-red-500' : seatsPct >= 70 ? 'bg-amber-400' : 'bg-green-500'}`}
              style={{ width: `${seatsPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">{seatsPct}% de puestos utilizados</p>
        </div>

        <UtilCard
          label="Equipos en línea"
          value={`${onlineTotal} / ${s?.total ?? 0}`}
          sub={`${s?.active ?? 0} activos · ${s?.passive ?? 0} en pausa · ${s?.offline ?? 0} sin señal`}
          icon={Monitor}
          color="#3b82f6"
        />

        <UtilCard
          label="Consentimientos"
          value={
            consentPendientes.length === 0
              ? 'Al día'
              : `${consentPendientes.length} pendiente${consentPendientes.length === 1 ? '' : 's'}`
          }
          sub={
            consentPendientes.length === 0
              ? 'todos los agentes autorizados'
              : 'monitoreo sin autorización (Ley 1581)'
          }
          icon={ShieldCheck}
          color={consentPendientes.length === 0 ? '#22c55e' : '#ef4444'}
        />
      </div>

      {/* Geo map */}
      <GeoLocationWidget locations={geoLocations} />
    </div>
  )
}
