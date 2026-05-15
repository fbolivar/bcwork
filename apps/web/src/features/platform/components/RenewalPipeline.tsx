'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { formatCOP, formatDate, daysUntil } from '@/lib/format'
import { RefreshCw, ChevronDown } from 'lucide-react'

const STATUS_CONFIG = {
  null: { label: 'Sin contactar', color: 'bg-gray-100 text-gray-600' },
  contacted: { label: 'Contactado', color: 'bg-blue-100 text-blue-700' },
  negotiating: { label: 'En negociación', color: 'bg-amber-100 text-amber-700' },
  renewed: { label: 'Renovado', color: 'bg-green-100 text-green-700' },
  lost: { label: 'Perdido', color: 'bg-red-100 text-red-700' },
} as const

type RenewalStatus = 'contacted' | 'negotiating' | 'renewed' | 'lost' | null

const DAYS_FILTERS = [
  { label: '7 días', value: 7 },
  { label: '14 días', value: 14 },
  { label: '30 días', value: 30 },
  { label: '60 días', value: 60 },
]

function UrgencyBadge({ days }: { days: number }) {
  if (days < 0)
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        Vencida
      </span>
    )
  if (days <= 7)
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        {days}d
      </span>
    )
  if (days <= 14)
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
        {days}d
      </span>
    )
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{days}d</span>
}

type PipelineRow = {
  id: string
  tenant_id: string | null
  plan_id: string | null
  seats_total: number | null
  status: string
  ends_at: string | null
  trial_ends_at: string | null
  renewal_status: string | null
  renewal_notes: string | null
  plans: { code: string; name: string; monthly_price_per_seat_cop: number } | null
  tenants: {
    id: string
    legal_name: string
    trade_name: string | null
    contact_email: string
  } | null
}

function RenewalRow({ row, onUpdated }: { row: PipelineRow; onUpdated: () => void }) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(row.renewal_notes ?? '')

  const mutation = trpc.platform.updateRenewalStatus.useMutation({
    onSuccess: () => {
      setOpen(false)
      onUpdated()
    },
  })

  const effectiveEnd = row.trial_ends_at ?? row.ends_at ?? ''
  const days = effectiveEnd ? daysUntil(effectiveEnd) : 0
  const mrr = (row.plans?.monthly_price_per_seat_cop ?? 0) * (row.seats_total ?? 0)
  const currentStatus = (row.renewal_status ?? null) as RenewalStatus
  const cfg = STATUS_CONFIG[currentStatus ?? 'null']

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/super-admin/tenants/${row.tenant_id}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {row.tenants?.trade_name ?? row.tenants?.legal_name ?? '—'}
            </Link>
            <UrgencyBadge days={days} />
          </div>
          <p className="text-xs text-gray-400">
            {row.tenants?.contact_email} · Plan {row.plans?.code?.toUpperCase() ?? '—'} ·{' '}
            {row.seats_total ?? 0} seats ·{' '}
            {row.status === 'active' ? formatCOP(mrr) + '/mes' : row.status}
          </p>
          {row.renewal_notes && (
            <p className="mt-1 text-xs italic text-gray-500">"{row.renewal_notes}"</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
            {cfg.label}
          </span>
          <span className="text-xs text-gray-400">
            {effectiveEnd ? formatDate(effectiveEnd) : '—'}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            title="Actualizar estado"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Estado de renovación</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      mutation.mutate({
                        licenseId: row.id,
                        renewalStatus: s === 'null' ? null : (s as RenewalStatus),
                        renewalNotes: notes || undefined,
                      })
                    }
                    disabled={mutation.isPending}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity disabled:opacity-50 ${
                      (currentStatus ?? 'null') === s
                        ? STATUS_CONFIG[s].color + ' ring-2 ring-current ring-offset-1'
                        : STATUS_CONFIG[s].color + ' opacity-60 hover:opacity-100'
                    }`}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                className="mb-1.5 block text-xs font-medium text-gray-500"
                htmlFor={`notes-${row.id}`}
              >
                Notas
              </label>
              <div className="flex gap-2">
                <input
                  id={`notes-${row.id}`}
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contexto de la negociación..."
                  maxLength={2000}
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      licenseId: row.id,
                      renewalStatus: currentStatus,
                      renewalNotes: notes || undefined,
                    })
                  }
                  className="rounded-lg bg-gray-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {mutation.isPending ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function RenewalPipeline() {
  const [daysAhead, setDaysAhead] = useState(30)
  const { data, isLoading, refetch } = trpc.platform.getRenewalPipeline.useQuery(
    { daysAhead },
    { refetchInterval: 120_000 },
  )

  const rows = (data ?? []) as PipelineRow[]

  const byStatus = {
    urgent: rows.filter((r) => daysUntil(r.trial_ends_at ?? r.ends_at ?? '') <= 7),
    pending: rows.filter(
      (r) => !r.renewal_status && daysUntil(r.trial_ends_at ?? r.ends_at ?? '') > 7,
    ),
    contacted: rows.filter((r) => r.renewal_status === 'contacted'),
    negotiating: rows.filter((r) => r.renewal_status === 'negotiating'),
    renewed: rows.filter((r) => r.renewal_status === 'renewed'),
    lost: rows.filter((r) => r.renewal_status === 'lost'),
  }

  const totalMrr = rows.reduce(
    (s, r) => s + (r.plans?.monthly_price_per_seat_cop ?? 0) * (r.seats_total ?? 0),
    0,
  )

  return (
    <div className="space-y-6">
      {/* KPI + filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-4">
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-3">
            <p className="text-xs text-gray-500">Licencias en riesgo</p>
            <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-3">
            <p className="text-xs text-gray-500">MRR en riesgo</p>
            <p className="text-2xl font-bold text-amber-600">{formatCOP(totalMrr)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-3">
            <p className="text-xs text-gray-500">Urgentes (≤7d)</p>
            <p className="text-2xl font-bold text-red-600">{byStatus.urgent.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {DAYS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setDaysAhead(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                daysAhead === f.value
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => refetch()}
            title="Actualizar"
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-400">
            Sin licencias próximas a vencer en los próximos {daysAhead} días
          </p>
        </div>
      )}

      {/* Sección: urgentes */}
      {byStatus.urgent.length > 0 && (
        <Section title="Urgente — vencen en ≤7 días" count={byStatus.urgent.length} accent="red">
          {byStatus.urgent.map((r) => (
            <RenewalRow key={r.id} row={r} onUpdated={refetch} />
          ))}
        </Section>
      )}

      {/* Sección: sin contactar */}
      {byStatus.pending.length > 0 && (
        <Section title="Sin contactar" count={byStatus.pending.length}>
          {byStatus.pending.map((r) => (
            <RenewalRow key={r.id} row={r} onUpdated={refetch} />
          ))}
        </Section>
      )}

      {/* Sección: en proceso */}
      {(byStatus.contacted.length > 0 || byStatus.negotiating.length > 0) && (
        <Section
          title="En proceso"
          count={byStatus.contacted.length + byStatus.negotiating.length}
          accent="amber"
        >
          {[...byStatus.contacted, ...byStatus.negotiating].map((r) => (
            <RenewalRow key={r.id} row={r} onUpdated={refetch} />
          ))}
        </Section>
      )}

      {/* Sección: cerradas */}
      {(byStatus.renewed.length > 0 || byStatus.lost.length > 0) && (
        <Section title="Cerradas" count={byStatus.renewed.length + byStatus.lost.length}>
          {[...byStatus.renewed, ...byStatus.lost].map((r) => (
            <RenewalRow key={r.id} row={r} onUpdated={refetch} />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string
  count: number
  accent?: 'red' | 'amber'
  children: React.ReactNode
}) {
  const color =
    accent === 'red' ? 'text-red-600' : accent === 'amber' ? 'text-amber-600' : 'text-gray-600'
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h2 className={`text-sm font-semibold ${color}`}>{title}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
