'use client'

import { useState } from 'react'
import {
  CreditCard,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Mail,
  ChevronDown,
  ChevronUp,
  Zap,
  Receipt,
} from 'lucide-react'
import { trpc as api } from '@/lib/trpc-client'

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

const AVAILABLE_PLANS = [
  { code: 'starter', name: 'Starter', price: 49000, seats: 10 },
  { code: 'growth', name: 'Growth', price: 149000, seats: 50 },
  { code: 'enterprise', name: 'Enterprise', price: null, seats: null },
]

const EVENT_LABELS: Record<string, string> = {
  invoice_created: 'Factura generada',
  payment_received: 'Pago recibido',
  payment_failed: 'Pago fallido',
  seat_added: 'Asiento agregado',
  seat_removed: 'Asiento eliminado',
  trial_started: 'Prueba iniciada',
  trial_expired: 'Prueba vencida',
}

function UpgradeModal({ planName, onClose }: { planName: string; onClose: () => void }) {
  const [sent, setSent] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {sent ? '¡Solicitud enviada!' : `Cambiar a ${planName}`}
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
              Nuestro equipo se pondrá en contacto contigo en menos de 24 horas.
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
              Un asesor de BCWork procesará el cambio al plan <strong>{planName}</strong>.
            </p>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
              <Mail className="mr-1.5 inline h-3.5 w-3.5" />
              Recibirás un correo de confirmación con los detalles.
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
  const [showPlans, setShowPlans] = useState(false)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const { data, isLoading } = api.admin.getBillingInfo.useQuery()
  const { data: events = [] } = api.admin.listBillingEvents.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  const status = data?.status ?? 'trial'
  const daysLeft = data?.daysLeft ?? 0
  const seatsUsed = data?.seatsUsed ?? 0
  const seatsTotal = data?.seatsTotal ?? 0
  const seatPct = seatsTotal ? Math.round((seatsUsed / seatsTotal) * 100) : 0
  const planCode = data?.plan?.code ?? 'pro'
  const planName = data?.plan?.name ?? 'Pro'
  const planPrice = data?.plan?.monthly_price_per_seat_cop
  const planFeatures = PLAN_FEATURES[planCode] ?? []

  const statusBadge =
    status === 'trial'
      ? { label: 'Prueba gratuita', color: 'bg-amber-100 text-amber-700' }
      : status === 'active'
        ? { label: 'Activo', color: 'bg-green-100 text-green-700' }
        : status === 'past_due'
          ? { label: 'Pago pendiente', color: 'bg-red-100 text-red-700' }
          : { label: 'Cancelado', color: 'bg-gray-100 text-gray-600' }

  return (
    <div className="space-y-4">
      {/* Banner trial o pago pendiente */}
      {(status === 'trial' || status === 'past_due') && (
        <div
          className={`flex items-center gap-4 rounded-xl border px-5 py-4 ${
            status === 'past_due' || daysLeft <= 3
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          {status === 'past_due' ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          ) : (
            <Clock
              className={`h-5 w-5 shrink-0 ${daysLeft <= 3 ? 'text-red-500' : 'text-amber-500'}`}
            />
          )}
          <div className="flex-1">
            <p
              className={`text-sm font-semibold ${status === 'past_due' || daysLeft <= 3 ? 'text-red-800' : 'text-amber-800'}`}
            >
              {status === 'past_due'
                ? 'Tienes un pago pendiente'
                : daysLeft === 0
                  ? 'Tu prueba gratuita ha vencido'
                  : `Tu prueba gratuita vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
            </p>
            <p
              className={`text-xs ${status === 'past_due' || daysLeft <= 3 ? 'text-red-600' : 'text-amber-600'}`}
            >
              {status === 'past_due'
                ? 'Regulariza el pago para evitar la suspensión del servicio.'
                : 'Activa un plan para continuar usando BCWork sin interrupciones.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPlans(true)}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Ver planes
          </button>
        </div>
      )}

      {/* Plan contratado */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Tu plan</h3>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge.color}`}>
            {statusBadge.label}
          </span>
        </div>

        <div className="mt-3 flex items-end gap-3">
          <p className="text-3xl font-bold capitalize text-gray-900">{planName}</p>
          {planPrice && <p className="mb-1 text-sm text-gray-500">{fmt(planPrice)} / seat / mes</p>}
        </div>

        {data?.license?.ends_at && (
          <p className="mt-1 text-xs text-gray-400">
            Vigente hasta: {fmtDate(data.license.ends_at)}
          </p>
        )}

        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {planFeatures.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" />
              {f}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setShowPlans((v) => !v)}
          className="mt-4 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          {showPlans ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Ocultar planes
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Cambiar plan
            </>
          )}
        </button>
      </div>

      {/* Planes disponibles (colapsados) */}
      {showPlans && (
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Planes disponibles</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {AVAILABLE_PLANS.map((plan) => {
              const isCurrent = planCode === plan.code
              return (
                <div
                  key={plan.code}
                  className={`rounded-xl border p-4 ${isCurrent ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-400' : 'border-gray-100'}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-800">{plan.name}</p>
                    {isCurrent && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Actual
                      </span>
                    )}
                  </div>
                  <p className="text-base font-bold text-gray-900">
                    {plan.price ? `${fmt(plan.price)}/seat` : 'A la medida'}
                  </p>
                  {plan.seats && (
                    <p className="text-xs text-gray-400">Hasta {plan.seats} empleados</p>
                  )}
                  <ul className="mt-3 space-y-1">
                    {(PLAN_FEATURES[plan.code] ?? []).map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <CheckCircle className="h-3 w-3 shrink-0 text-green-500" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => !isCurrent && setUpgrading(plan.name)}
                    className={`mt-3 w-full rounded-lg py-1.5 text-xs font-semibold transition-colors disabled:cursor-default disabled:opacity-60 ${
                      isCurrent
                        ? 'border border-blue-300 text-blue-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isCurrent ? 'Plan activo' : plan.price ? 'Seleccionar' : 'Contactar ventas'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Uso de asientos */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-700">Uso de asientos</h3>
        </div>
        <div className="mb-2 flex items-end gap-1">
          <span className="text-3xl font-bold text-gray-900">{seatsUsed}</span>
          <span className="mb-1 text-sm text-gray-400">/ {seatsTotal} asientos</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-2 rounded-full transition-all ${
              seatPct >= 90 ? 'bg-red-500' : seatPct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            // eslint-disable-next-line react/forbid-dom-props
            style={{ width: `${Math.min(seatPct, 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-400">{seatPct}% de capacidad utilizada</p>
        {seatPct >= 80 && (
          <p className="mt-1 text-xs text-amber-600">
            Estás cerca del límite. Considera ampliar tu plan.
          </p>
        )}
      </div>

      {/* Historial */}
      {(events as unknown[]).length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-50 px-5 py-3">
            <Receipt className="h-4 w-4 text-gray-400" />
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
              {(
                events as {
                  id: string
                  event_type: string
                  amount_cop?: number
                  occurred_at: string
                }[]
              ).map((ev) => (
                <tr key={ev.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 text-gray-700">
                    {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                  </td>
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
