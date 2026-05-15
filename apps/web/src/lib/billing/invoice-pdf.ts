'use client'

// Lazy-loaded on client side only — jspdf is not SSR-safe
export interface InvoiceData {
  invoiceNumber: string
  periodStart: string
  periodEnd: string
  dueDate: string
  paidAt?: string | null
  status: string
  planName: string
  planCode: string
  seats: number
  unitPriceCop: number
  subtotalCop: number
  taxCop: number
  totalCop: number
  paymentMethod?: string | null
  paymentReference?: string | null
  notes?: string | null
  // Tenant info
  tenantLegalName: string
  tenantNit: string
  tenantEmail: string
}

function fmtCop(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export async function generateInvoicePdf(invoice: InvoiceData): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const margin = 18
  const contentW = W - margin * 2

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42) // #0f172a
  doc.rect(0, 0, W, 38, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('BCWork', margin, 20)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text('Plataforma SaaS de teletrabajo', margin, 27)
  doc.text('ventas@bcwork.co · www.bcwork.co', margin, 33)

  // Invoice label (top right)
  doc.setTextColor(6, 182, 212) // cyan-500
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURA', W - margin, 18, { align: 'right' })
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(invoice.invoiceNumber, W - margin, 26, { align: 'right' })

  const statusLabel =
    invoice.status === 'paid'
      ? 'PAGADA'
      : invoice.status === 'pending'
        ? 'PENDIENTE'
        : invoice.status === 'overdue'
          ? 'VENCIDA'
          : invoice.status.toUpperCase()

  const statusColor: [number, number, number] =
    invoice.status === 'paid'
      ? [22, 163, 74]
      : invoice.status === 'overdue'
        ? [220, 38, 38]
        : [217, 119, 6]

  doc.setFillColor(...statusColor)
  doc.roundedRect(W - margin - 28, 29, 28, 7, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(statusLabel, W - margin - 14, 34, { align: 'center' })

  // ── Billing info section ────────────────────────────────────────────────────
  let y = 48

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURADO A', margin, y)
  doc.text('DETALLES', W / 2 + 4, y)

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)
  doc.setFontSize(9)

  const leftLines = [invoice.tenantLegalName, `NIT: ${invoice.tenantNit}`, invoice.tenantEmail]
  leftLines.forEach((line) => {
    doc.text(line, margin, y)
    y += 5
  })

  const rightY = 53
  const pairs: [string, string][] = [
    ['Período:', `${fmtDate(invoice.periodStart)} — ${fmtDate(invoice.periodEnd)}`],
    ['Fecha de emisión:', fmtDate(new Date().toISOString().slice(0, 10))],
    ['Fecha de vencimiento:', fmtDate(invoice.dueDate)],
    ...(invoice.paidAt ? ([['Pagado el:', fmtDate(invoice.paidAt)]] as [string, string][]) : []),
  ]

  pairs.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    doc.text(label, W / 2 + 4, rightY + i * 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.text(value, W / 2 + 38, rightY + i * 5)
  })

  y = Math.max(y, rightY + pairs.length * 5) + 8

  // ── Divider ─────────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, W - margin, y)
  y += 8

  // ── Items table ─────────────────────────────────────────────────────────────
  // Header
  doc.setFillColor(248, 250, 252)
  doc.rect(margin, y - 2, contentW, 8, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('DESCRIPCIÓN', margin + 2, y + 3.5)
  doc.text('CANT.', margin + 90, y + 3.5, { align: 'right' })
  doc.text('PRECIO UNIT.', margin + 120, y + 3.5, { align: 'right' })
  doc.text('TOTAL', W - margin - 2, y + 3.5, { align: 'right' })
  y += 10

  // Row
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(9)
  const description = `Suscripción BCWork ${invoice.planName} — ${fmtDate(invoice.periodStart)} a ${fmtDate(invoice.periodEnd)}`
  doc.text(description, margin + 2, y)
  doc.text(String(invoice.seats), margin + 90, y, { align: 'right' })
  doc.text(fmtCop(invoice.unitPriceCop), margin + 120, y, { align: 'right' })
  doc.text(fmtCop(invoice.subtotalCop), W - margin - 2, y, { align: 'right' })
  y += 12

  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y - 4, W - margin, y - 4)

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalsX = W - margin - 70
  const totalsValueX = W - margin - 2

  const totalsRows: [string, string][] = [
    ['Subtotal:', fmtCop(invoice.subtotalCop)],
    ['IVA:', fmtCop(invoice.taxCop)],
  ]

  doc.setFontSize(9)
  totalsRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(label, totalsX, y)
    doc.setTextColor(30, 41, 59)
    doc.text(value, totalsValueX, y, { align: 'right' })
    y += 6
  })

  // Total box
  doc.setFillColor(15, 23, 42)
  doc.roundedRect(totalsX - 4, y - 2, W - margin - totalsX + 4 + 2, 10, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL:', totalsX, y + 5)
  doc.setTextColor(6, 182, 212)
  doc.text(fmtCop(invoice.totalCop), totalsValueX, y + 5, { align: 'right' })
  y += 16

  // ── Payment info ─────────────────────────────────────────────────────────────
  if (invoice.paymentMethod || invoice.paymentReference) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    doc.text('INFORMACIÓN DE PAGO', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(51, 65, 85)
    if (invoice.paymentMethod) {
      doc.text(`Método: ${invoice.paymentMethod.toUpperCase()}`, margin, y)
      y += 4.5
    }
    if (invoice.paymentReference) {
      doc.text(`Referencia: ${invoice.paymentReference}`, margin, y)
      y += 4.5
    }
    y += 4
  }

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    doc.text('NOTAS', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    const noteLines = doc.splitTextToSize(invoice.notes, contentW)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 5 + 4
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footerY = 280
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, footerY, W - margin, footerY)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('BCWork — BC Fabric SAS · ventas@bcwork.co · bcwork.co', W / 2, footerY + 5, {
    align: 'center',
  })
  doc.text(
    'Este documento es generado electrónicamente y tiene validez como comprobante de pago.',
    W / 2,
    footerY + 9.5,
    { align: 'center' },
  )

  doc.save(`factura-${invoice.invoiceNumber}.pdf`)
}
