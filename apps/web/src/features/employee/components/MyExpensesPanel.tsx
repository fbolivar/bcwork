'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  Receipt,
  Plus,
  X,
  Plane,
  UtensilsCrossed,
  Monitor,
  Code,
  GraduationCap,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'

type ExpenseCategory = 'travel' | 'food' | 'equipment' | 'software' | 'training' | 'other'

const CAT_MAP: Record<ExpenseCategory, { label: string; icon: React.ReactNode; color: string }> = {
  travel: { label: 'Viaje', icon: <Plane className="h-4 w-4" />, color: 'text-blue-600' },
  food: {
    label: 'Alimentación',
    icon: <UtensilsCrossed className="h-4 w-4" />,
    color: 'text-orange-600',
  },
  equipment: { label: 'Equipos', icon: <Monitor className="h-4 w-4" />, color: 'text-gray-600' },
  software: { label: 'Software', icon: <Code className="h-4 w-4" />, color: 'text-purple-600' },
  training: {
    label: 'Capacitación',
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'text-green-600',
  },
  other: { label: 'Otro', icon: <MoreHorizontal className="h-4 w-4" />, color: 'text-gray-500' },
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

export function MyExpensesPanel() {
  const utils = trpc.useUtils()
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [category, setCategory] = useState<ExpenseCategory>('travel')
  const [description, setDescription] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')

  const { data: expenses, isLoading } = trpc.employee.getMyExpenses.useQuery()

  const submit = trpc.employee.submitExpense.useMutation({
    onSuccess: () => {
      utils.employee.getMyExpenses.invalidate()
      setShowModal(false)
      setTitle('')
      setAmount('')
      setDescription('')
      setReceiptUrl('')
    },
  })

  const cancel = trpc.employee.cancelExpense.useMutation({
    onSuccess: () => utils.employee.getMyExpenses.invalidate(),
  })

  const pending = (expenses ?? []).filter((e) => e.status === 'pending')
  const totalPending = pending.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mis gastos</h1>
          <p className="mt-0.5 text-sm text-gray-500">Solicita reembolsos de gastos de trabajo</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo gasto
        </button>
      </div>

      {!isLoading && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-3">
            <p className="text-xs text-yellow-700">Pendiente de aprobación</p>
            <p className="mt-0.5 text-xl font-bold text-yellow-800">
              {fmtCurrency(totalPending, 'COP')}
            </p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
            <p className="text-xs text-green-600">Reembolsado (año)</p>
            <p className="mt-0.5 text-xl font-bold text-green-700">
              {fmtCurrency(
                (expenses ?? [])
                  .filter(
                    (e) =>
                      e.status === 'reimbursed' &&
                      new Date(e.expense_date).getFullYear() === new Date().getFullYear(),
                  )
                  .reduce((s, e) => s + Number(e.amount), 0),
                'COP',
              )}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (expenses ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <Receipt className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No hay gastos registrados</p>
          <p className="mt-1 text-xs text-gray-400">
            Agrega gastos de trabajo para solicitar reembolso
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(expenses ?? []).map((e) => {
            const cat = CAT_MAP[e.category as ExpenseCategory] ?? CAT_MAP.other
            const st = STATUS_MAP[e.status] ?? STATUS_MAP.pending
            return (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
              >
                <div className={cat.color}>{cat.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{e.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {cat.label} ·{' '}
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
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${st?.color ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {st?.label ?? e.status}
                </span>
                {e.status === 'pending' && (
                  <button
                    type="button"
                    title="Cancelar"
                    onClick={() => cancel.mutate({ id: e.id })}
                    disabled={cancel.isPending}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nuevo gasto</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="exp-title" className="text-xs font-medium text-gray-700">
                  Descripción
                </label>
                <input
                  id="exp-title"
                  type="text"
                  placeholder="Ej: Vuelo Bogotá-Medellín"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exp-amount" className="text-xs font-medium text-gray-700">
                    Monto
                  </label>
                  <input
                    id="exp-amount"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="exp-currency" className="text-xs font-medium text-gray-700">
                    Moneda
                  </label>
                  <select
                    id="exp-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="COP">COP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exp-date" className="text-xs font-medium text-gray-700">
                    Fecha
                  </label>
                  <input
                    id="exp-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="exp-cat" className="text-xs font-medium text-gray-700">
                    Categoría
                  </label>
                  <select
                    id="exp-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(CAT_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="exp-receipt" className="text-xs font-medium text-gray-700">
                  URL del recibo (opcional)
                </label>
                <input
                  id="exp-receipt"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="exp-desc" className="text-xs font-medium text-gray-700">
                  Notas adicionales
                </label>
                <textarea
                  id="exp-desc"
                  rows={2}
                  placeholder="Contexto del gasto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!title.trim() || !amount || Number(amount) <= 0 || submit.isPending}
                onClick={() =>
                  submit.mutate({
                    title,
                    expense_date: date,
                    amount: Number(amount),
                    currency,
                    category,
                    description: description || undefined,
                    receipt_url: receiptUrl || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Enviar solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
