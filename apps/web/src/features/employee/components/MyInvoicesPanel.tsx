'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, X, FileText, Download, CheckCircle, Clock, Send, XCircle } from 'lucide-react'

const STATUS_CONFIG = {
  draft: { label: 'Borrador', cls: 'bg-gray-100 text-gray-600', icon: Clock },
  sent: { label: 'Enviada', cls: 'bg-blue-100 text-blue-700', icon: Send },
  paid: { label: 'Pagada', cls: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-600', icon: XCircle },
}

const CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'ARS', 'CLP']

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function NewInvoiceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const utils = trpc.useUtils()
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = today.slice(0, 8) + '01'

  const [periodStart, setPeriodStart] = useState(firstOfMonth)
  const [periodEnd, setPeriodEnd] = useState(today)
  const [hours, setHours] = useState(0)
  const [rate, setRate] = useState(0)
  const [currency, setCurrency] = useState('COP')
  const [taxRate, setTaxRate] = useState(0)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const subtotal = hours * rate
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const create = trpc.employee.createInvoice.useMutation({
    onSuccess: () => {
      void utils.employee.getMyInvoices.invalidate()
      onSaved()
    },
    onError: (e) => setError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (hours <= 0) {
      setError('Las horas trabajadas deben ser mayores a 0')
      return
    }
    if (rate <= 0) {
      setError('La tarifa por hora debe ser mayor a 0')
      return
    }
    create.mutate({
      period_start: periodStart,
      period_end: periodEnd,
      hours_worked: hours,
      rate_per_hour: rate,
      currency,
      tax_rate: taxRate,
      client_name: clientName || undefined,
      client_email: clientEmail || undefined,
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Nueva factura</h3>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-start" className="text-xs font-medium text-gray-700">
                Período desde
              </label>
              <input
                id="inv-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="inv-end" className="text-xs font-medium text-gray-700">
                Período hasta
              </label>
              <input
                id="inv-end"
                type="date"
                value={periodEnd}
                min={periodStart}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="inv-hours" className="text-xs font-medium text-gray-700">
                Horas trabajadas
              </label>
              <input
                id="inv-hours"
                type="number"
                min={0}
                step={0.5}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="inv-rate" className="text-xs font-medium text-gray-700">
                Tarifa / hora
              </label>
              <input
                id="inv-rate"
                type="number"
                min={0}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="inv-currency" className="text-xs font-medium text-gray-700">
                Moneda
              </label>
              <select
                id="inv-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="inv-tax" className="text-xs font-medium text-gray-700">
              IVA / impuesto (%)
            </label>
            <input
              id="inv-tax"
              type="number"
              min={0}
              max={100}
              step={1}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="mt-1 w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {total > 0 && (
            <div className="rounded-xl bg-blue-50 p-3">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Subtotal</span>
                <span>{fmtCurrency(subtotal, currency)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-sm text-blue-700">
                  <span>IVA ({taxRate}%)</span>
                  <span>{fmtCurrency(taxAmount, currency)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between font-bold text-blue-900">
                <span>Total</span>
                <span>{fmtCurrency(total, currency)}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-client" className="text-xs font-medium text-gray-700">
                Cliente (opcional)
              </label>
              <input
                id="inv-client"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="inv-email" className="text-xs font-medium text-gray-700">
                Email cliente (opcional)
              </label>
              <input
                id="inv-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="inv-notes" className="text-xs font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={2000}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {create.isPending ? 'Creando…' : 'Crear factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

async function downloadInvoicePDF(inv: {
  invoice_number: string | null
  period_start: string
  period_end: string
  hours_worked: number
  rate_per_hour: number
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  notes: string | null
  client_name: string | null
  client_email: string | null
  created_at: string
}) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const W = 210
  const blue = [30, 64, 175] as [number, number, number]

  doc.setFillColor(...blue)
  doc.rect(0, 0, W, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURA', 20, 22)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(inv.invoice_number ?? 'BORRADOR', W - 20, 22, { align: 'right' })

  doc.setTextColor(60, 60, 60)
  doc.setFontSize(10)
  let y = 50
  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, 20, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 90, y)
    y += 8
  }

  row(
    'Período:',
    `${new Date(inv.period_start + 'T12:00:00').toLocaleDateString('es-CO')} — ${new Date(inv.period_end + 'T12:00:00').toLocaleDateString('es-CO')}`,
  )
  row('Horas trabajadas:', `${inv.hours_worked}h`)
  row('Tarifa por hora:', fmtCurrency(inv.rate_per_hour, inv.currency))
  if (inv.client_name) row('Cliente:', inv.client_name)
  if (inv.client_email) row('Email:', inv.client_email)

  y += 5
  doc.setFillColor(245, 247, 255)
  doc.rect(15, y - 5, W - 30, inv.tax_rate > 0 ? 32 : 24, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text('Subtotal', 20, y + 3)
  doc.text(fmtCurrency(inv.subtotal, inv.currency), W - 20, y + 3, { align: 'right' })
  y += 8
  if (inv.tax_rate > 0) {
    doc.text(`IVA (${inv.tax_rate}%)`, 20, y + 3)
    doc.text(fmtCurrency(inv.tax_amount, inv.currency), W - 20, y + 3, { align: 'right' })
    y += 8
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...blue)
  doc.text('TOTAL', 20, y + 3)
  doc.text(fmtCurrency(inv.total_amount, inv.currency), W - 20, y + 3, { align: 'right' })

  if (inv.notes) {
    y += 20
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text('Notas:', 20, y)
    y += 5
    doc.text(doc.splitTextToSize(inv.notes, W - 40) as string[], 20, y)
  }

  doc.setTextColor(160, 160, 160)
  doc.setFontSize(8)
  doc.text(`Generado el ${new Date().toLocaleDateString('es-CO')}`, 20, 285)

  doc.save(`${inv.invoice_number ?? 'factura'}.pdf`)
}

export function MyInvoicesPanel() {
  const [showNew, setShowNew] = useState(false)
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.employee.getMyInvoices.useQuery()
  const updateStatus = trpc.employee.updateInvoiceStatus.useMutation({
    onSuccess: () => void utils.employee.getMyInvoices.invalidate(),
  })

  const totalPaid = (data ?? [])
    .filter((i) => i.status === 'paid')
    .reduce((s, i) => s + Number(i.total_amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mis facturas</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Genera y gestiona tus facturas por horas trabajadas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva factura
        </button>
      </div>

      {totalPaid > 0 && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
            <p className="text-xs text-green-600">Total cobrado</p>
            <p className="mt-0.5 text-2xl font-bold text-green-700">
              {fmtCurrency(totalPaid, data?.[0]?.currency ?? 'COP')}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Facturas totales</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-700">{(data ?? []).length}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((inv) => {
            const cfg =
              STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft
            const Icon = cfg.icon
            return (
              <div key={inv.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {inv.invoice_number ?? 'Borrador'}
                      </p>
                      <span className="text-xs text-gray-400">·</span>
                      <p className="text-sm text-gray-600">
                        {inv.hours_worked}h · {inv.currency}
                      </p>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {new Date(inv.period_start + 'T12:00:00').toLocaleDateString('es-CO')} —{' '}
                      {new Date(inv.period_end + 'T12:00:00').toLocaleDateString('es-CO')}
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {fmtCurrency(Number(inv.total_amount), inv.currency)}
                    </p>
                    {inv.client_name && (
                      <p className="mt-0.5 text-xs text-gray-400">Cliente: {inv.client_name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.cls}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadInvoicePDF(inv)}
                      title="Descargar PDF"
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <Download className="h-3 w-3" /> PDF
                    </button>
                  </div>
                </div>
                {inv.status === 'draft' && (
                  <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: inv.id, status: 'sent' })}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Marcar enviada
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: inv.id, status: 'paid' })}
                      className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                    >
                      Marcar pagada
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: inv.id, status: 'cancelled' })}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                {inv.status === 'sent' && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: inv.id, status: 'paid' })}
                      className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                    >
                      Marcar como pagada
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">Sin facturas</p>
          <p className="mt-1 text-xs text-gray-400">
            Genera tu primera factura por horas trabajadas
          </p>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="mt-4 text-sm font-medium text-blue-600 hover:underline"
          >
            Crear primera factura
          </button>
        </div>
      )}

      {showNew && (
        <NewInvoiceModal onClose={() => setShowNew(false)} onSaved={() => setShowNew(false)} />
      )}
    </div>
  )
}
