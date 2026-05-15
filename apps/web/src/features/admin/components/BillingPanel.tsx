'use client'

import { useState } from 'react'
import {
  CreditCard,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  FileText,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Pagada', cls: 'bg-green-100 text-green-700' },
  overdue: { label: 'Vencida', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500' },
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Monitoreo básico', 'Control de jornada', 'Reportes estándar', 'Soporte email'],
  growth: ['Monitoreo avanzado', 'Analytics', 'Gestión ausencias', 'Soporte prioritario', 'API'],
  enterprise: ['SLA 99.9%', 'SSO/SAML', 'Account manager', 'Capacitación', 'API dedicada'],
}

export function BillingPanel() {
  const [showPlans, setShowPlans] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data: info, isLoading: infoLoading } = api.admin.getBillingInfo.useQuery()
  const { data: invoices = [], isLoading: invLoading } = api.billing.listInvoices.useQuery({
    status: 'all',
  })
  const checkoutMutation = api.billing.createWompiCheckout.useMutation({
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl
    },
    onSettled: () => setPaying(null),
  })

  async function downloadPdf(invoice: (typeof invoices)[0]) {
    setDownloadingId(invoice.id)
    try {
      const { generateInvoicePdf } = await import('@/lib/billing/invoice-pdf')
      await generateInvoicePdf({
        invoiceNumber: invoice.invoice_number,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
        dueDate: invoice.due_date,
        paidAt: invoice.paid_at,
        status: invoice.status,
        planName: invoice.plan_name,
        planCode: invoice.plan_code,
        seats: invoice.seats,
        unitPriceCop: invoice.unit_price_cop,
        subtotalCop: invoice.subtotal_cop,
        taxCop: invoice.tax_cop,
        totalCop: invoice.total_cop,
        paymentMethod: invoice.payment_method,
        paymentReference: invoice.payment_reference,
        notes: invoice.notes,
        tenantLegalName: (info?.tenant as { legal_name?: string } | null)?.legal_name ?? 'Empresa',
        tenantNit: (info?.tenant as { nit?: string } | null)?.nit ?? '—',
        tenantEmail: (info?.tenant as { contact_email?: string } | null)?.contact_email ?? '—',
      })
    } finally {
      setDownloadingId(null)
    }
  }

  if (infoLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  const status = info?.status ?? 'trial'
  const daysLeft = info?.daysLeft ?? 0
  const seatsUsed = info?.seatsUsed ?? 0
  const seatsTotal = info?.seatsTotal ?? 0
  const seatPct = seatsTotal ? Math.round((seatsUsed / seatsTotal) * 100) : 0
  const planCode = (info?.plan as { code?: string } | null)?.code ?? 'growth'
  const planName = (info?.plan as { name?: string } | null)?.name ?? 'Growth'
  const planPrice = (info?.plan as { monthly_price_per_seat_cop?: number } | null)
    ?.monthly_price_per_seat_cop
  const planFeatures = PLAN_FEATURES[planCode] ?? []

  const pendingInvoices = invoices.filter((i) => i.status === 'pending')
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue')
  const hasUnpaid = pendingInvoices.length > 0 || overdueInvoices.length > 0

  return (
    <div className="space-y-4">
      {/* Banner: trial / pago pendiente */}
      {(status === 'trial' || status === 'past_due' || hasUnpaid) && (
        <div
          className={`flex items-start gap-4 rounded-xl border px-5 py-4 ${
            overdueInvoices.length > 0 || status === 'past_due'
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          {overdueInvoices.length > 0 ? (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          ) : (
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {overdueInvoices.length > 0
                ? `Tienes ${overdueInvoices.length} factura${overdueInvoices.length > 1 ? 's' : ''} vencida${overdueInvoices.length > 1 ? 's' : ''}`
                : pendingInvoices.length > 0
                  ? `Tienes ${pendingInvoices.length} factura${pendingInvoices.length > 1 ? 's' : ''} pendiente${pendingInvoices.length > 1 ? 's' : ''} de pago`
                  : daysLeft === 0
                    ? 'Tu prueba gratuita ha vencido'
                    : `Tu prueba gratuita vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {overdueInvoices.length > 0
                ? 'Regulariza el pago para evitar la suspensión del servicio.'
                : 'Paga con tarjeta, PSE o Nequi. También puedes esperar cobro manual.'}
            </p>
          </div>
          {(pendingInvoices.length > 0 || overdueInvoices.length > 0) && (
            <button
              type="button"
              onClick={() => {
                const first = [...overdueInvoices, ...pendingInvoices][0]
                if (first) {
                  setPaying(first.id)
                  checkoutMutation.mutate({ invoiceId: first.id })
                }
              }}
              disabled={checkoutMutation.isPending}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <CreditCard className="h-3.5 w-3.5" />
              {checkoutMutation.isPending && paying ? 'Redirigiendo...' : 'Pagar ahora'}
            </button>
          )}
        </div>
      )}

      {/* Plan actual */}
      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Tu plan</h3>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              status === 'active'
                ? 'bg-green-100 text-green-700'
                : status === 'trial'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            {status === 'active' ? 'Activo' : status === 'trial' ? 'Prueba' : 'Pago pendiente'}
          </span>
        </div>

        <div className="mt-3 flex items-end gap-3">
          <p className="text-3xl font-bold capitalize text-gray-900">{planName}</p>
          {planPrice && (
            <p className="mb-1 text-sm text-gray-500">{fmt(planPrice)} / usuario / mes</p>
          )}
        </div>

        {info?.license && (info.license as { ends_at?: string }).ends_at && (
          <p className="mt-1 text-xs text-gray-400">
            Vigente hasta: {fmtDate((info.license as { ends_at: string }).ends_at)}
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
              <ChevronDown className="h-3.5 w-3.5" /> Ver otros planes
            </>
          )}
        </button>
      </div>

      {/* Upgrade plans */}
      {showPlans && (
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Planes disponibles</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['starter', 'growth', 'enterprise'] as const).map((code) => {
              const prices: Record<string, number | null> = {
                starter: 9900,
                growth: 14900,
                enterprise: null,
              }
              const names: Record<string, string> = {
                starter: 'Starter',
                growth: 'Growth',
                enterprise: 'Enterprise',
              }
              const isCurrent = planCode === code
              const price = prices[code]
              return (
                <div
                  key={code}
                  className={`rounded-xl border p-4 ${isCurrent ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-400' : 'border-gray-100'}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-800">{names[code]}</p>
                    {isCurrent && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Actual
                      </span>
                    )}
                  </div>
                  <p className="text-base font-bold text-gray-900">
                    {price ? `${fmt(price)}/usuario` : 'A la medida'}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {(PLAN_FEATURES[code] ?? []).map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <CheckCircle className="h-3 w-3 shrink-0 text-green-500" /> {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={code === 'enterprise' ? 'mailto:ventas@bcwork.co' : undefined}
                    onClick={
                      code === 'enterprise'
                        ? undefined
                        : (e) => {
                            e.preventDefault()
                            window.open(
                              'mailto:ventas@bcwork.co?subject=Cambio%20de%20plan',
                              '_blank',
                            )
                          }
                    }
                    className={`mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                      isCurrent
                        ? 'cursor-default border border-blue-300 text-blue-700 opacity-60'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isCurrent ? (
                      'Plan activo'
                    ) : code === 'enterprise' ? (
                      <>
                        <ExternalLink className="h-3 w-3" /> Hablar con ventas
                      </>
                    ) : (
                      'Solicitar cambio'
                    )}
                  </a>
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
            Estás cerca del límite. Contacta a ventas@bcwork.co para ampliar.
          </p>
        )}
      </div>

      {/* Facturas */}
      <div className="rounded-xl border border-gray-100 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-50 px-5 py-3">
          <Receipt className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Facturas</h3>
        </div>

        {invLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">Sin facturas aún</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50 text-left text-[10px] uppercase tracking-widest text-gray-400">
                <th className="px-4 py-2.5">Nro.</th>
                <th className="px-4 py-2.5">Período</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Vence</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const badge = STATUS_BADGE[inv.status] ?? {
                  label: inv.status,
                  cls: 'bg-gray-100 text-gray-600',
                }
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-700">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {fmtDate(inv.period_start)} — {fmtDate(inv.period_end)}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">
                      {fmt(inv.total_cop)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{fmtDate(inv.due_date)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {inv.status === 'pending' || inv.status === 'overdue' ? (
                          <button
                            type="button"
                            title="Pagar con Wompi"
                            onClick={() => {
                              setPaying(inv.id)
                              checkoutMutation.mutate({ invoiceId: inv.id })
                            }}
                            disabled={checkoutMutation.isPending && paying === inv.id}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            <CreditCard className="h-3 w-3" />
                            {checkoutMutation.isPending && paying === inv.id ? '...' : 'Pagar'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          title="Descargar PDF"
                          onClick={() => downloadPdf(inv)}
                          disabled={downloadingId === inv.id}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-60"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Manual payment info */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
        <p className="text-xs font-semibold text-blue-800">¿Prefieres pago por transferencia?</p>
        <p className="mt-1 text-xs text-blue-600">
          Escríbenos a{' '}
          <a href="mailto:ventas@bcwork.co" className="font-semibold underline">
            ventas@bcwork.co
          </a>{' '}
          con el número de tu factura y procesaremos el cobro manual dentro de 24 horas.
        </p>
      </div>
    </div>
  )
}
