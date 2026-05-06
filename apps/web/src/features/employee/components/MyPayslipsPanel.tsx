'use client'

import { trpc } from '@/lib/trpc-client'
import { DollarSign, CheckCircle, Clock, FileText, Check } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: {
    label: 'Borrador',
    color: 'bg-gray-100 text-gray-600',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  issued: {
    label: 'Emitido',
    color: 'bg-blue-100 text-blue-700',
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  acknowledged: {
    label: 'Confirmado',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function MyPayslipsPanel() {
  const utils = trpc.useUtils()
  const { data: payslips, isLoading } = trpc.employee.getMyPayslips.useQuery()

  const acknowledge = trpc.employee.acknowledgePayslip.useMutation({
    onSuccess: () => utils.employee.getMyPayslips.invalidate(),
  })

  const issued = (payslips ?? []).filter((p) => p.status === 'issued')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis recibos de nómina</h1>
        <p className="mt-0.5 text-sm text-gray-500">Historial de pagos y liquidaciones</p>
      </div>

      {!isLoading && issued.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">
            Tienes {issued.length} recibo{issued.length > 1 ? 's' : ''} nuevo
            {issued.length > 1 ? 's' : ''} por confirmar
          </p>
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Total recibido (año)</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900">
              {fmtCurrency(
                (payslips ?? [])
                  .filter(
                    (p) =>
                      p.status !== 'draft' &&
                      new Date(p.period_start).getFullYear() === new Date().getFullYear(),
                  )
                  .reduce((s, p) => s + Number(p.net_amount), 0),
                (payslips ?? [])[0]?.currency ?? 'COP',
              )}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Recibos totales</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900">{(payslips ?? []).length}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (payslips ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <DollarSign className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No hay recibos aún</p>
          <p className="mt-1 text-xs text-gray-400">Tu empleador los publicará aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(payslips ?? []).map((p) => {
            const st = STATUS_MAP[p.status] ?? STATUS_MAP.draft
            return (
              <div key={p.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{p.period_label}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(p.period_start + 'T12:00:00').toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                      })}
                      {' — '}
                      {new Date(p.period_end + 'T12:00:00').toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {p.hours_worked ? ` · ${p.hours_worked}h trabajadas` : ''}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${st?.color ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {st?.icon}
                    {st?.label ?? p.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Bruto</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-700">
                      {fmtCurrency(Number(p.gross_amount), p.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Deducciones</p>
                    <p className="mt-0.5 text-sm font-semibold text-red-600">
                      -{fmtCurrency(Number(p.deductions), p.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Neto</p>
                    <p className="mt-0.5 text-sm font-bold text-green-700">
                      {fmtCurrency(Number(p.net_amount), p.currency)}
                    </p>
                  </div>
                </div>

                {p.notes && (
                  <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    {p.notes}
                  </p>
                )}

                {p.status === 'issued' && (
                  <button
                    type="button"
                    onClick={() => acknowledge.mutate({ id: p.id })}
                    disabled={acknowledge.isPending}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Confirmar recibido
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
