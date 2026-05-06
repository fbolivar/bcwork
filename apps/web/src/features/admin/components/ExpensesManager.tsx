'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Receipt, CheckCircle, XCircle, DollarSign, Filter } from 'lucide-react'

type ExpenseCategory = 'travel' | 'food' | 'equipment' | 'software' | 'training' | 'other'

const CAT_LABELS: Record<ExpenseCategory, string> = {
  travel: 'Viaje',
  food: 'Alimentación',
  equipment: 'Equipos',
  software: 'Software',
  training: 'Capacitación',
  other: 'Otro',
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprobado', color: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-600' },
  reimbursed: { label: 'Reembolsado', color: 'bg-green-100 text-green-700' },
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ExpensesManager() {
  const utils = trpc.useUtils()
  const [filterStatus, setFilterStatus] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [noteId, setNoteId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const { data: expenses, isLoading } = trpc.admin.getAdminExpenses.useQuery({
    status: (filterStatus as 'pending' | 'approved' | 'rejected' | 'reimbursed' | 'all') || 'all',
  })
  const { data: usersData } = trpc.admin.listUsers.useQuery({ pageSize: 100 })

  const update = trpc.admin.updateExpenseStatus.useMutation({
    onSuccess: () => {
      utils.admin.getAdminExpenses.invalidate()
      setNoteId(null)
      setNote('')
    },
  })

  const totalPending = ((expenses ?? []) as any[])
    .filter((e: any) => e.status === 'pending')
    .reduce((s: number, e: any) => s + Number(e.amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Gastos del equipo</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Aprueba y gestiona solicitudes de reembolso
          </p>
        </div>
        {totalPending > 0 && (
          <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-2">
            <p className="text-xs text-yellow-600">Pendiente</p>
            <p className="text-sm font-bold text-yellow-800">{fmtCurrency(totalPending, 'COP')}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500">
          <Filter className="h-3.5 w-3.5" />
        </div>
        <select
          title="Filtrar por estado"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          title="Filtrar por empleado"
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todos los empleados</option>
          {(usersData?.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : ((expenses ?? []) as any[]).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay gastos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {((expenses ?? []) as any[]).map((raw) => {
            type ExpRow = {
              id: string
              title: string
              amount: number
              currency: string
              category: string
              status: string
              expense_date: string
              receipt_url: string | null
              manager_note: string | null
              users?: { full_name: string } | null
            }
            const e = raw as ExpRow
            const st = STATUS_MAP[e.status] ?? STATUS_MAP.pending
            return (
              <div key={e.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{e.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {e.users?.full_name ?? '—'} ·{' '}
                      {CAT_LABELS[e.category as ExpenseCategory] ?? e.category} ·{' '}
                      {new Date(e.expense_date + 'T12:00:00').toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {e.manager_note && (
                      <p className="mt-0.5 text-xs italic text-gray-500">"{e.manager_note}"</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {fmtCurrency(Number(e.amount), e.currency)}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st?.color ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {st?.label ?? e.status}
                  </span>
                  {e.receipt_url && (
                    <a
                      href={e.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Recibo
                    </a>
                  )}
                </div>

                {e.status === 'pending' &&
                  (noteId === e.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        rows={2}
                        placeholder="Nota (opcional)..."
                        value={note}
                        onChange={(ev) => setNote(ev.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNoteId(null)
                            setNote('')
                          }}
                          className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={update.isPending}
                          onClick={() =>
                            update.mutate({
                              id: e.id,
                              status: 'rejected',
                              manager_note: note || undefined,
                            })
                          }
                          className="flex-1 rounded-lg bg-red-50 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                        >
                          Rechazar
                        </button>
                        <button
                          type="button"
                          disabled={update.isPending}
                          onClick={() =>
                            update.mutate({
                              id: e.id,
                              status: 'approved',
                              manager_note: note || undefined,
                            })
                          }
                          className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Aprobar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNoteId(e.id)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Revisar solicitud
                    </button>
                  ))}

                {e.status === 'approved' && (
                  <button
                    type="button"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: e.id, status: 'reimbursed' })}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-xs font-medium text-white hover:bg-green-700"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    Marcar como reembolsado
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
