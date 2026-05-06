'use client'

import dynamic from 'next/dynamic'
import { trpc } from '@/lib/trpc-client'
import {
  Monitor,
  Users,
  Activity,
  ShieldCheck,
  Zap,
  Users2,
  Circle,
  ArrowRight,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

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

// ── Status Row ────────────────────────────────────────────────────────────────

function StatusRow({
  count,
  label,
  dot,
  bg,
  text,
}: {
  count: number
  label: string
  dot: string
  bg: string
  text: string
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${bg}`}>
      <div className="flex items-center gap-3">
        <Circle className={`h-3 w-3 ${dot}`} />
        <span className={`text-sm font-medium ${text}`}>{label}</span>
      </div>
      <span className={`text-2xl font-bold ${text}`}>{count}</span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardStats() {
  const stats = trpc.admin.getStats.useQuery(undefined, { refetchInterval: 60_000 })
  const snap = trpc.admin.getTeamSnapshot.useQuery(undefined, { refetchInterval: 30_000 })
  const { data: geoLocations = [] } = trpc.manager.getTeamGeoLocations.useQuery()

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'
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

      {/* 4 KPI cards — operacionales de hoy */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Dispositivos */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Dispositivos
            </p>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Monitor className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold tabular-nums text-gray-900">{onlineTotal}</p>
          <p className="mt-1 text-xs text-gray-500">de {s?.total ?? 0} registrados en línea</p>
        </div>

        {/* Sesiones activas */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Sesiones abiertas
            </p>
            <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold tabular-nums text-gray-900">
            {d?.activeSessions ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">ahora mismo</p>
        </div>

        {/* Usuarios */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Usuarios activos
            </p>
            <div className="rounded-xl bg-cyan-50 p-2 text-cyan-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-bold tabular-nums text-gray-900">
            {d?.activeUsers ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">{d?.totalUsers ?? 0} registrados en total</p>
        </div>

        {/* Última sincronización */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Actualización
            </p>
            <div className="rounded-xl bg-slate-50 p-2 text-slate-500">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-lg font-bold text-gray-900">
            {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-1 text-xs text-gray-500">datos en tiempo real · auto-refresh 30s</p>
        </div>
      </div>

      {/* Middle: Team status + Link to Métricas */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Estado del equipo */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Estado del equipo ahora</h3>
            <span className="text-xs text-gray-400">actualiza cada 30 seg</span>
          </div>
          <div className="space-y-2.5">
            <StatusRow
              count={s?.active ?? 0}
              label="Activos — señal en los últimos 2 min"
              dot="fill-green-500 text-green-500"
              bg="bg-green-50"
              text="text-green-700"
            />
            <StatusRow
              count={s?.passive ?? 0}
              label="En pausa — sin señal 2 a 10 min"
              dot="fill-amber-400 text-amber-400"
              bg="bg-amber-50"
              text="text-amber-700"
            />
            <StatusRow
              count={s?.offline ?? 0}
              label="Offline — sin señal más de 10 min"
              dot="fill-slate-300 text-slate-300"
              bg="bg-slate-50"
              text="text-slate-500"
            />
          </div>
        </div>

        {/* Acceso rápido a Métricas */}
        <div className="flex flex-col justify-between rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Análisis de productividad</h3>
            <p className="mt-1 text-xs text-gray-500">
              Tendencias históricas, categorías de apps, carga de trabajo por día y ranking de
              usuarios están en la sección de Métricas.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
              {[
                'Productividad % vs meta — últimos 7/14/30 días',
                'Donut de categorías de aplicaciones',
                'Barras de carga: productivo / neutral / no productivo',
                'Ranking de usuarios más productivos',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-400">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/admin/metrics"
            className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Ver métricas completas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Utility row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Licencia con barra de uso */}
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
          <p className="mt-1 text-xs text-gray-400">{seatsPct}% de seats utilizados</p>
        </div>

        <UtilCard
          label="Equipos · Horarios"
          value={`${d?.teamsCount ?? 0} · ${d?.schedulesCount ?? 0}`}
          sub="configurados en el sistema"
          icon={Users2}
          color="#8b5cf6"
        />

        <UtilCard
          label="Cumplimiento legal"
          value="Activo"
          sub="Ley 1581/2012 · Ley 2191/2022"
          icon={ShieldCheck}
          color="#22c55e"
        />
      </div>

      {/* Geo map */}
      <GeoLocationWidget locations={geoLocations} />
    </div>
  )
}
