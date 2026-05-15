'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { formatDate } from '@/lib/format'
import { CheckCircle2, Circle, AlertCircle, Send, Check } from 'lucide-react'

const STEPS = [
  { key: 'hasLogo', label: 'Logo / info empresa' },
  { key: 'hasEmployees', label: 'Primer empleado invitado' },
  { key: 'hasSchedule', label: 'Horario laboral configurado' },
  { key: 'isComplete', label: 'Onboarding completado' },
] as const

type FunnelRow = {
  tenantId: string
  tenantName: string
  contactEmail: string
  createdAt: string | null
  daysSinceCreation: number
  isComplete: boolean
  hasLogo: boolean
  hasEmployees: boolean
  hasSchedule: boolean
  stepsCompleted: number
  userCount: number
}

function FunnelBar({ pct }: { pct: number }) {
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (barRef.current) barRef.current.style.width = `${pct}%`
  }, [pct])
  return (
    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
      <div ref={barRef} className="h-full rounded-full bg-blue-500 transition-all" />
    </div>
  )
}

function StepDot({ done }: { done: boolean }) {
  return done ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  ) : (
    <Circle className="h-4 w-4 text-gray-300" />
  )
}

export function OnboardingFunnel() {
  const [filter, setFilter] = useState<'all' | 'stuck' | 'done'>('all')
  const [emailSent, setEmailSent] = useState<string | null>(null)

  const { data, isLoading, refetch } = trpc.platform.getOnboardingFunnel.useQuery(undefined, {
    refetchInterval: 120_000,
  })

  const emailMutation = trpc.platform.sendEmailToTenant.useMutation({
    onSuccess: (_, vars) => {
      setEmailSent(vars.tenantId)
      setTimeout(() => setEmailSent(null), 3000)
    },
  })

  const rows = (data?.rows ?? []) as FunnelRow[]

  const filtered = rows.filter((r) => {
    if (filter === 'stuck') return !r.isComplete && r.daysSinceCreation > 3
    if (filter === 'done') return r.isComplete
    return true
  })

  const completionRate =
    data && data.totalTenants > 0 ? Math.round((data.completedCount / data.totalTenants) * 100) : 0

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Total empresas</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{data?.totalTenants ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Completado onboarding</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {data?.completedCount ?? 0}
            <span className="ml-1 text-sm font-normal text-gray-400">({completionRate}%)</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Atascadas (&gt;3 días)</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{data?.stuckCount ?? 0}</p>
        </div>
      </div>

      {/* Funnel visual */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Funnel de adopción</h2>
        <div className="space-y-2">
          {STEPS.map((step) => {
            const count = rows.filter((r) => r[step.key]).length
            const total = rows.length
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={step.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-gray-600">{step.label}</span>
                  <span className="font-semibold text-gray-900">
                    {count}/{total} ({pct}%)
                  </span>
                </div>
                <FunnelBar pct={pct} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabla */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {(['all', 'stuck', 'done'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'stuck' ? 'Atascadas' : 'Completadas'}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
            <p className="text-sm text-gray-400">Sin empresas en esta categoría</p>
          </div>
        )}

        {filtered.map((row) => (
          <div
            key={row.tenantId}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/super-admin/tenants/${row.tenantId}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {row.tenantName}
                </Link>
                {!row.isComplete && row.daysSinceCreation > 3 && (
                  <span title="Atascada">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  </span>
                )}
                {row.isComplete && (
                  <span title="Onboarding completo">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {row.contactEmail} · Creado {formatDate(row.createdAt ?? '')} · {row.userCount}{' '}
                usuario{row.userCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Steps */}
            <div className="hidden items-center gap-1 sm:flex">
              {STEPS.map((step) => (
                <div key={step.key} title={step.label}>
                  <StepDot done={row[step.key]} />
                </div>
              ))}
            </div>

            {/* Progress label */}
            <div className="shrink-0 text-right">
              <p className="text-xs font-semibold text-gray-700">{row.stepsCompleted}/4 pasos</p>
              <p className="text-xs text-gray-400">{row.daysSinceCreation}d activa</p>
            </div>

            {/* Send reminder */}
            {!row.isComplete && (
              <button
                type="button"
                disabled={emailMutation.isPending || emailSent === row.tenantId}
                onClick={() =>
                  emailMutation.mutate({
                    tenantId: row.tenantId,
                    subject: 'Completa la configuración de tu empresa en BCWork',
                    body: `Hola,\n\nNos dimos cuenta que aún no has completado la configuración inicial de tu empresa en BCWork.\n\nIngresa a la plataforma y completa los pasos de onboarding para sacar el máximo provecho.\n\nEl proceso toma menos de 5 minutos.\n\nSi tienes preguntas, responde este email y te ayudamos.`,
                  })
                }
                title="Enviar recordatorio"
                className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {emailSent === row.tenantId ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {emailSent === row.tenantId ? 'Enviado' : 'Recordatorio'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
