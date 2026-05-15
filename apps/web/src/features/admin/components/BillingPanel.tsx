'use client'

import { useState } from 'react'
import { trpc as api } from '@/lib/trpc-client'
import { CreditCard, Users, Zap, CheckCircle, Clock, AlertCircle, X, Mail } from 'lucide-react'

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Hasta 10 empleados', 'Monitoreo básico', 'Reportes estándar', 'Soporte por email'],
  growth: [
    'Hasta 50 empleados',
    'Monitoreo avanzado',
    'Todos los reportes',
    'API access',
    'Soporte prioritario',
  ],
  pro: [
    'Hasta 200 empleados',
    'Módulo compliance',
    'Nómina colombiana',
    'ATS incluido',
    'Soporte dedicado',
  ],
  enterprise: [
    'Empleados ilimitados',
    'SLA 99.9%',
    'Onboarding personalizado',
    'Integración ERP',
    'Account manager',
  ],
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  trial: { label: 'Prueba gratuita', color: 'bg-amber-100 text-amber-700', icon: Clock },
  active: { label: 'Activa', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  past_due: { label: 'Pago pendiente', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600', icon: AlertCircle },
}

function UpgradeModal({ planName, onClose }: { planName: string; onClose: () => void }) {
  const [sent, setSent] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {sent ? '¡Solicitud enviada!' : `Actualizar a ${planName}`}
          </h3>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {sent ? (
          <div className="mt-4 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <p className="text-sm text-gray-700">
              Nuestro equipo se pondrá en contacto contigo en menos de 24 horas para gestionar el
              cambio de plan.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-500">
              Un asesor de BCWork se pondrá en contacto contigo para procesar el cambio al plan{' '}
              <strong>{planName}</strong>.
            </p>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
              <Mail className="mr-1.5 inline h-3.5 w-3.5" />
              Recibirás un correo de confirmación con los detalles del proceso de actualización.
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setSent(true)}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Solicitar cambio
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function BillingPanel() {
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const { data, isLoading } = api.admin.getBillingInfo.useQuery()
  const { data: events = [] } = api.admin.listBillingEvents.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  const status = (data?.status ?? 'trial') as keyof typeof STATUS_CONFIG
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['trial']!
  const StatusIcon = statusCfg.icon
  const planFeatures = PLAN_FEATURES[data?.plan?.code ?? 'pro'] ?? []
  const seatPct = data?.seatsTotal ? Math.round((data.seatsUsed / data.seatsTotal) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Trial banner */}
      {status === 'trial' && data?.daysLeft !== null && (
        <div
          className={`rounded-xl border px-5 py-4 ${(data?.daysLeft ?? 0) <= 3 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
        >
          <div className="flex items-center gap-3">
            <Clock
              className={`h-5 w-5 shrink-0 ${(data?.daysLeft ?? 0) <= 3 ? 'text-red-500' : 'text-amber-500'}`}
            />
            <div>
              <p
                className={`text-sm font-semibold ${(data?.daysLeft ?? 0) <= 3 ? 'text-red-800' : 'text-amber-800'}`}
              >
                {data?.daysLeft === 0
                  ? 'Tu prueba gratuita ha vencido'
                  : `Tu prueba gratuita vence en ${data?.daysLeft} día${data?.daysLeft !== 1 ? 's' : ''}`}
              </p>
              <p
                className={`text-xs ${(data?.daysLeft ?? 0) <= 3 ? 'text-red-600' : 'text-amber-600'}`}
              >
                Actualiza tu plan para continuar usando BCWork sin interrupciones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUpgrading('Growth')}
              className="ml-auto shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Actualizar plan
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Plan actual */}
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-700">Plan actual</h3>
            </div>
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.color}`}
            >
              <StatusIcon className="h-3 w-3" />
              {statusCfg.label}
            </span>
          </div>
          <p className="text-2xl font-bold capitalize text-gray-900">{data?.plan?.name ?? 'Pro'}</p>
          {data?.plan?.monthly_price_per_seat_cop && (
            <p className="mt-1 text-sm text-gray-500">
              {fmt(data.plan.monthly_price_per_seat_cop)} / seat / mes
            </p>
          )}
          <ul className="mt-4 space-y-1.5">
            {planFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" />
                {f}
              </li>
            ))}
          </ul>
          {data?.license?.ends_at && (
            <p className="mt-4 text-xs text-gray-400">
              Válido hasta: {fmtDate(data.license.ends_at)}
            </p>
          )}
        </div>

        {/* Seats */}
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-700">Uso de asientos</h3>
          </div>
          <div className="mb-2 flex items-end gap-1">
            <span className="text-3xl font-bold text-gray-900">{data?.seatsUsed}</span>
            <span className="mb-1 text-sm text-gray-400">/ {data?.seatsTotal} seats</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-2.5 rounded-full transition-all ${seatPct >= 90 ? 'bg-red-500' : seatPct >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${seatPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">{seatPct}% de capacidad utilizada</p>
          {seatPct >= 80 && (
            <p className="mt-2 text-xs text-amber-600">
              Considera ampliar tu plan para agregar más colaboradores.
            </p>
          )}
          <button
            type="button"
            onClick={() => setUpgrading('Enterprise')}
            className="mt-4 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Ampliar plan
          </button>
        </div>
      </div>

      {/* Planes disponibles */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Planes disponibles</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { code: 'starter', name: 'Starter', price: 49000, seats: 10, highlight: false },
            { code: 'growth', name: 'Growth', price: 149000, seats: 50, highlight: true },
            { code: 'enterprise', name: 'Enterprise', price: null, seats: null, highlight: false },
          ].map((plan) => (
            <div
              key={plan.code}
              className={`rounded-xl border p-4 ${plan.highlight ? 'border-blue-300 bg-blue-50' : 'border-gray-100'} ${data?.plan?.code === plan.code ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <p
                  className={`text-sm font-bold ${plan.highlight ? 'text-blue-800' : 'text-gray-800'}`}
                >
                  {plan.name}
                </p>
                {data?.plan?.code === plan.code && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Actual
                  </span>
                )}
              </div>
              <p className="text-lg font-bold text-gray-900">
                {plan.price ? `${fmt(plan.price)}/seat` : 'A la medida'}
              </p>
              {plan.seats && <p className="text-xs text-gray-400">Hasta {plan.seats} empleados</p>}
              <ul className="mt-3 space-y-1">
                {(PLAN_FEATURES[plan.code] ?? []).slice(0, 3).map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <CheckCircle className="h-3 w-3 text-green-500" /> {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={data?.plan?.code === plan.code}
                onClick={() => {
                  if (data?.plan?.code !== plan.code) setUpgrading(plan.name)
                }}
                className={`mt-3 w-full rounded-lg py-1.5 text-xs font-semibold disabled:cursor-default disabled:opacity-60 ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {data?.plan?.code === plan.code
                  ? 'Plan activo'
                  : plan.price
                    ? 'Seleccionar'
                    : 'Contactar ventas'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Historial de facturación */}
      {events.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white">
          <div className="border-b border-gray-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Historial de facturación</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50 text-left text-[10px] uppercase tracking-widest text-gray-400">
                <th className="px-4 py-2.5">Evento</th>
                <th className="px-4 py-2.5">Monto</th>
                <th className="px-4 py-2.5">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(events as any[]).map((ev) => (
                <tr key={ev.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 text-gray-700">{ev.event_type}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {ev.amount_cop ? fmt(ev.amount_cop) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{fmtDate(ev.occurred_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {upgrading && <UpgradeModal planName={upgrading} onClose={() => setUpgrading(null)} />}
    </div>
  )
}
