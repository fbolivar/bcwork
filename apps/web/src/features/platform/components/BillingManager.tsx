'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Download,
  X,
  Loader2,
  CreditCard,
  Receipt,
} from 'lucide-react'

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

const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string; icon: React.FC<{ className?: string }> }
> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700', icon: Clock },
  paid: { label: 'Pagada', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
  overdue: { label: 'Vencida', cls: 'bg-red-100 text-red-700', icon: AlertCircle },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500', icon: XCircle },
}

type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue' | 'cancelled'

type InvoiceRow = {
  id: string
  tenant_id: string
  invoice_number: string
  period_start: string
  period_end: string
  plan_name: string
  seats: number
  total_cop: number
  status: string
  due_date: string
  paid_at: string | null
  payment_method: string | null
  payment_reference: string | null
  notes: string | null
  license_id: string | null
  tenants: { legal_name: string; trade_name: string | null; contact_email: string } | null
}

// ─── Create Invoice Modal ─────────────────────────────────────────────────────

function CreateInvoiceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [tenantId, setTenantId] = useState('')
  const [planCode, setPlanCode] = useState('growth')
  const [seats, setSeats] = useState(5)
  const [taxPct, setTaxPct] = useState(0)
  const [daysUntilDue, setDaysUntilDue] = useState(15)
  const [notes, setNotes] = useState('')

  const PLANS = [
    { code: 'starter', name: 'Starter', price: 9900 },
    { code: 'growth', name: 'Growth', price: 14900 },
    { code: 'enterprise', name: 'Enterprise', price: 19900 },
  ]
  const selectedPlan = PLANS.find((p) => p.code === planCode) ?? PLANS[1]!
  const subtotal = seats * selectedPlan.price
  const tax = Math.round(subtotal * (taxPct / 100))
  const total = subtotal + tax

  const today = new Date()
  const dueDate = new Date(today.getTime() + daysUntilDue * 86400000)
  const periodStart = today.toISOString().slice(0, 10)
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10)

  const { data: tenantsData } = trpc.platform.listTenants.useQuery({ status: 'all', pageSize: 100 })
  const tenants = tenantsData?.data ?? []

  const createMutation = trpc.billing.createInvoice.useMutation({
    onSuccess: () => {
      onCreated()
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Crear factura manual</h3>
          <button type="button" onClick={onClose} title="Cerrar">
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="ci-tenant" className="mb-1 block text-xs font-medium text-gray-700">
              Empresa *
            </label>
            <select
              id="ci-tenant"
              title="Seleccionar empresa"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Seleccionar empresa...</option>
              {(tenants as { id: string; legal_name: string; trade_name?: string | null }[]).map(
                (t) => (
                  <option key={t.id} value={t.id}>
                    {t.trade_name ?? t.legal_name}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ci-plan" className="mb-1 block text-xs font-medium text-gray-700">
                Plan
              </label>
              <select
                id="ci-plan"
                title="Seleccionar plan"
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {PLANS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} — {fmt(p.price)}/seat
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ci-seats" className="mb-1 block text-xs font-medium text-gray-700">
                Asientos
              </label>
              <input
                id="ci-seats"
                type="number"
                min={1}
                max={500}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ci-tax" className="mb-1 block text-xs font-medium text-gray-700">
                IVA (%)
              </label>
              <input
                id="ci-tax"
                type="number"
                min={0}
                max={100}
                value={taxPct}
                onChange={(e) => setTaxPct(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ci-days" className="mb-1 block text-xs font-medium text-gray-700">
                Días para vencer
              </label>
              <input
                id="ci-days"
                type="number"
                min={1}
                max={90}
                value={daysUntilDue}
                onChange={(e) => setDaysUntilDue(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Notas internas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Opcional..."
            />
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Período</span>
              <span>
                {fmtDate(periodStart)} — {fmtDate(periodEnd)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Vencimiento</span>
              <span>{fmtDate(dueDate.toISOString().slice(0, 10))}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm font-bold text-gray-900">
              <span>Total</span>
              <span className="text-blue-600">{fmt(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!tenantId || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                tenantId,
                planCode,
                planName: selectedPlan.name,
                seats,
                unitPriceCop: selectedPlan.price,
                taxPct,
                periodStart,
                periodEnd,
                dueDate: dueDate.toISOString().slice(0, 10),
                notes: notes || undefined,
              })
            }
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Crear factura
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mark Paid Modal ──────────────────────────────────────────────────────────

function MarkPaidModal({
  invoice,
  onClose,
  onPaid,
}: {
  invoice: InvoiceRow
  onClose: () => void
  onPaid: () => void
}) {
  const [method, setMethod] = useState<'manual' | 'transfer' | 'wompi' | 'other'>('transfer')
  const [reference, setReference] = useState('')
  const [extendMonths, setExtendMonths] = useState(1)
  const [notes, setNotes] = useState('')

  const markPaidMutation = trpc.billing.markInvoicePaid.useMutation({
    onSuccess: () => {
      onPaid()
      onClose()
    },
  })

  const tenantName = invoice.tenants?.trade_name ?? invoice.tenants?.legal_name ?? 'Empresa'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Confirmar pago</h3>
          <button type="button" onClick={onClose} title="Cerrar">
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">{tenantName}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {invoice.invoice_number} · {fmt(invoice.total_cop)}
            </p>
          </div>

          <div>
            <label htmlFor="mp-method" className="mb-1 block text-xs font-medium text-gray-700">
              Método de pago
            </label>
            <select
              id="mp-method"
              title="Seleccionar método de pago"
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="transfer">Transferencia bancaria</option>
              <option value="manual">Cobro manual</option>
              <option value="wompi">Wompi (confirmación manual)</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Referencia de pago
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Nro. transacción, comprobante..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="mp-months" className="mb-1 block text-xs font-medium text-gray-700">
              Extender licencia (meses)
            </label>
            <input
              id="mp-months"
              type="number"
              min={1}
              max={12}
              value={extendMonths}
              onChange={(e) => setExtendMonths(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              La licencia del tenant se extenderá automáticamente.
            </p>
          </div>

          <div>
            <label htmlFor="mp-notes" className="mb-1 block text-xs font-medium text-gray-700">
              Notas
            </label>
            <input
              id="mp-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas opcionales"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={markPaidMutation.isPending}
            onClick={() =>
              markPaidMutation.mutate({
                invoiceId: invoice.id,
                paymentMethod: method,
                paymentReference: reference || undefined,
                extendMonths,
                notes: notes || undefined,
              })
            }
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {markPaidMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Marcar como pagada
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BillingManager() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<InvoiceRow | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const {
    data: invoices = [],
    isLoading,
    refetch,
  } = trpc.billing.listAllInvoices.useQuery({
    status: statusFilter,
    limit: 150,
  })

  const { data: summary } = trpc.billing.getBillingSummary.useQuery()

  const cancelMutation = trpc.billing.cancelInvoice.useMutation({
    onSuccess: () => refetch(),
  })

  async function downloadPdf(inv: InvoiceRow) {
    setDownloadingId(inv.id)
    try {
      const { generateInvoicePdf } = await import('@/lib/billing/invoice-pdf')
      await generateInvoicePdf({
        invoiceNumber: inv.invoice_number,
        periodStart: inv.period_start,
        periodEnd: inv.period_end,
        dueDate: inv.due_date,
        paidAt: inv.paid_at,
        status: inv.status,
        planName: inv.plan_name,
        planCode: inv.plan_name.toLowerCase(),
        seats: inv.seats,
        unitPriceCop: Math.round(inv.total_cop / inv.seats),
        subtotalCop: inv.total_cop,
        taxCop: 0,
        totalCop: inv.total_cop,
        paymentMethod: inv.payment_method,
        paymentReference: inv.payment_reference,
        notes: inv.notes,
        tenantLegalName: inv.tenants?.legal_name ?? 'Empresa',
        tenantNit: '—',
        tenantEmail: inv.tenants?.contact_email ?? '—',
      })
    } finally {
      setDownloadingId(null)
    }
  }

  const typedInvoices = invoices as InvoiceRow[]

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Por cobrar',
              count: summary.pendingCount,
              amount: summary.pendingCop,
              cls: 'text-amber-600',
              border: 'border-amber-200 bg-amber-50',
            },
            {
              label: 'Cobrado (30d)',
              count: summary.paidCount,
              amount: summary.paidCop,
              cls: 'text-green-600',
              border: 'border-green-200 bg-green-50',
            },
            {
              label: 'Vencidas',
              count: summary.overdueCount,
              amount: summary.overdueCop,
              cls: 'text-red-600',
              border: 'border-red-200 bg-red-50',
            },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.border}`}>
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`mt-1 text-2xl font-bold ${kpi.cls}`}>{kpi.count}</p>
              <p className="text-xs text-gray-500">{fmt(kpi.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'pending', 'overdue', 'paid', 'cancelled'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all'
                ? 'Todas'
                : s === 'pending'
                  ? 'Pendientes'
                  : s === 'overdue'
                    ? 'Vencidas'
                    : s === 'paid'
                      ? 'Pagadas'
                      : 'Canceladas'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva factura
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
          <Receipt className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Facturas de suscripción</h2>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : typedInvoices.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">Sin facturas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] uppercase tracking-widest text-gray-400">
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Nro.</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {typedInvoices.map((inv) => {
                  const cfg = STATUS_CONFIG[inv.status]
                  const Icon = cfg?.icon ?? Clock
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">
                          {inv.tenants?.trade_name ?? inv.tenants?.legal_name ?? '—'}
                        </p>
                        <p className="text-gray-400">{inv.tenants?.contact_email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-600">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {inv.plan_name} · {inv.seats} seats
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {fmt(inv.total_cop)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(inv.due_date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg?.cls ?? 'bg-gray-100 text-gray-500'}`}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg?.label ?? inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {(inv.status === 'pending' || inv.status === 'overdue') && (
                            <button
                              type="button"
                              title="Marcar como pagada"
                              onClick={() => setMarkingPaid(inv)}
                              className="flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-green-700"
                            >
                              <CreditCard className="h-3 w-3" />
                              Pagar
                            </button>
                          )}
                          <button
                            type="button"
                            title="Descargar PDF"
                            disabled={downloadingId === inv.id}
                            onClick={() => downloadPdf(inv)}
                            className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:opacity-60"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          {inv.status === 'pending' && (
                            <button
                              type="button"
                              title="Cancelar factura"
                              onClick={() => {
                                if (confirm('¿Cancelar esta factura?'))
                                  cancelMutation.mutate({ invoiceId: inv.id })
                              }}
                              className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateInvoiceModal onClose={() => setShowCreateModal(false)} onCreated={() => refetch()} />
      )}

      {markingPaid && (
        <MarkPaidModal
          invoice={markingPaid}
          onClose={() => setMarkingPaid(null)}
          onPaid={() => refetch()}
        />
      )}
    </div>
  )
}
