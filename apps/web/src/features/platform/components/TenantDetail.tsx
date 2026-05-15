'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { StatusBadge } from './StatusBadge'
import { LicenseCard } from './LicenseCard'
import { AuditLogTable } from './AuditLogTable'
import { TenantNotes } from './TenantNotes'
import { TenantTimeline } from './TenantTimeline'
import { CommunicationHistory } from './CommunicationHistory'
import { HealthScorePanel } from './HealthScoreBadge'
import { TenantTagsEditor } from './TenantTagsEditor'
import { formatDate } from '@/lib/format'
import { useEffect, useRef } from 'react'
import {
  ArrowLeft,
  AlertTriangle,
  X,
  LogIn,
  Loader2,
  Users,
  Activity,
  Clock,
  Wrench,
  CalendarPlus,
  Check,
  Mail,
  Send,
} from 'lucide-react'

type ConfirmAction = 'suspend' | 'reactivate' | 'cancel'

const ACTION_CONFIG: Record<
  ConfirmAction,
  { title: string; message: string; confirmLabel: string; danger: boolean; newStatus: string }
> = {
  suspend: {
    title: 'Suspender empresa',
    message:
      'Los empleados perderán acceso inmediatamente. El admin recibirá un aviso. Puedes reactivarla en cualquier momento.',
    confirmLabel: 'Sí, suspender',
    danger: false,
    newStatus: 'suspended',
  },
  reactivate: {
    title: 'Reactivar empresa',
    message: 'La empresa recuperará acceso completo a la plataforma.',
    confirmLabel: 'Sí, reactivar',
    danger: false,
    newStatus: 'active',
  },
  cancel: {
    title: 'Cancelar empresa',
    message:
      'Esta acción marca la empresa como cancelada. Los datos se conservan según la política de retención configurada. No se puede deshacer automáticamente.',
    confirmLabel: 'Sí, cancelar',
    danger: true,
    newStatus: 'cancelled',
  },
}

function ConfirmModal({
  action,
  tenantName,
  onConfirm,
  onClose,
  isPending,
}: {
  action: ConfirmAction
  tenantName: string
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  const cfg = ACTION_CONFIG[action]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`h-4 w-4 ${cfg.danger ? 'text-red-500' : 'text-amber-500'}`}
            />
            <h3 className="text-sm font-semibold text-gray-900">{cfg.title}</h3>
          </div>
          <button type="button" onClick={onClose} title="Cerrar">
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm font-medium text-gray-800">{tenantName}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{cfg.message}</p>
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
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              cfg.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isPending ? 'Procesando...' : cfg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function HealthBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (barRef.current) barRef.current.style.width = `${pct}%`
  }, [pct])
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div ref={barRef} className={`h-full rounded-full ${color}`} />
    </div>
  )
}

export function TenantDetail({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [impersonating, setImpersonating] = useState(false)
  const [maintenanceMsg, setMaintenanceMsg] = useState('')
  const [showMaintMsg, setShowMaintMsg] = useState(false)
  const [extendDone, setExtendDone] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailSentOk, setEmailSentOk] = useState(false)

  const { data: tenant, isLoading, refetch } = trpc.platform.getTenant.useQuery({ id: tenantId })

  const updateMutation = trpc.platform.updateTenant.useMutation({
    onSuccess: () => {
      refetch()
      setConfirmAction(null)
    },
  })

  const extendMutation = trpc.platform.extendTrial.useMutation({
    onSuccess: () => {
      setExtendDone(true)
      refetch()
      setTimeout(() => setExtendDone(false), 2500)
    },
  })

  const emailMutation = trpc.platform.sendEmailToTenant.useMutation({
    onSuccess: () => {
      setEmailSentOk(true)
      setEmailSubject('')
      setEmailBody('')
      setTimeout(() => {
        setEmailSentOk(false)
        setShowEmailModal(false)
      }, 2500)
    },
  })

  const maintenanceMutation = trpc.platform.toggleMaintenanceMode.useMutation({
    onSuccess: () => {
      refetch()
      setShowMaintMsg(false)
      setMaintenanceMsg('')
    },
  })

  const impersonateMutation = trpc.platform.impersonateTenant.useMutation({
    onSuccess: async ({ token }) => {
      setImpersonating(true)
      await fetch('/api/auth/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      router.push('/admin/dashboard')
    },
    onError: () => setImpersonating(false),
  })

  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
  if (!tenant) return <p className="text-red-500">Empresa no encontrada</p>

  const licenses =
    (tenant.licenses as Array<{
      id: string
      status: string
      seats_total: number
      ends_at: string
      trial_ends_at: string | null
      feature_overrides: Record<string, boolean> | null
      plans: {
        id?: string
        code: string
        name: string
        monthly_price_per_seat_cop: number
        features?: Record<string, boolean>
      } | null
    }>) ?? []

  const isMaintenance = !!(tenant as Record<string, unknown>).maintenance_mode
  const maintenanceMessage = (tenant as Record<string, unknown>).maintenance_message as
    | string
    | null
  const seatUtilization = ((tenant as Record<string, unknown>).seatUtilization as number) ?? 0
  const totalSeats = ((tenant as Record<string, unknown>).totalSeats as number) ?? 0
  const lastActivity = (tenant as Record<string, unknown>).lastActivity as string | null
  const isTrialOrActive = tenant.status === 'trial' || tenant.status === 'active'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/super-admin/tenants"
          className="mt-1 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              {tenant.trade_name ?? tenant.legal_name}
            </h1>
            <StatusBadge status={tenant.status} />
            {isMaintenance && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                Mantenimiento
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            NIT: {tenant.nit} · {tenant.contact_email} · {tenant.activeUserCount} usuarios activos
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna izquierda */}
        <div className="space-y-4">
          {/* Datos */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Datos de la empresa</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Razón social" value={tenant.legal_name} />
              <Row label="Nombre comercial" value={tenant.trade_name ?? '—'} />
              <Row label="NIT" value={tenant.nit} mono />
              <Row label="Timezone" value={tenant.timezone ?? '—'} />
              <Row label="Retención datos" value={`${tenant.data_retention_months ?? '—'} meses`} />
              <Row label="Oficial HABEAS DATA" value={tenant.data_protection_officer ?? '—'} />
              <Row label="Creado" value={formatDate(tenant.created_at ?? '')} />
            </dl>
          </div>

          {/* Health */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Salud del tenant</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Users className="h-3 w-3" /> Uso de seats
                  </span>
                  <span className="font-medium text-gray-800">
                    {tenant.activeUserCount}/{totalSeats}
                    <span className="ml-1 text-gray-400">({seatUtilization}%)</span>
                  </span>
                </div>
                <HealthBar
                  value={seatUtilization}
                  max={100}
                  color={
                    seatUtilization > 85
                      ? 'bg-red-400'
                      : seatUtilization > 60
                        ? 'bg-amber-400'
                        : 'bg-green-400'
                  }
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-gray-500">
                  <Clock className="h-3 w-3" /> Última actividad
                </span>
                <span className="font-medium text-gray-700">
                  {lastActivity ? formatDate(lastActivity) : 'Sin registro'}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Acciones rápidas</h2>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => impersonateMutation.mutate({ tenantId })}
                disabled={impersonating || impersonateMutation.isPending || !isTrialOrActive}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-300 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                {impersonating || impersonateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogIn className="h-3.5 w-3.5" />
                )}
                Entrar como este tenant
              </button>

              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Mail className="h-3.5 w-3.5" />
                Enviar email al admin
              </button>

              {/* Extender trial */}
              {isTrialOrActive && (
                <div className="rounded-md border border-gray-200 p-2">
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-gray-500">
                    <CalendarPlus className="h-3.5 w-3.5" /> Extender trial
                  </p>
                  <div className="flex gap-1.5">
                    {([7, 14, 30] as const).map((days) => (
                      <button
                        key={days}
                        type="button"
                        disabled={extendMutation.isPending}
                        onClick={() => extendMutation.mutate({ tenantId, days })}
                        className="flex flex-1 items-center justify-center gap-1 rounded border border-gray-200 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {extendDone && extendMutation.variables?.days === days ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : null}
                        +{days}d
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modo mantenimiento */}
              <div className="rounded-md border border-orange-200 p-2">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1 text-xs font-medium text-orange-700">
                    <Wrench className="h-3.5 w-3.5" />
                    {isMaintenance ? 'En mantenimiento' : 'Modo mantenimiento'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (isMaintenance) {
                        maintenanceMutation.mutate({ tenantId, enabled: false })
                      } else {
                        setShowMaintMsg((v) => !v)
                      }
                    }}
                    disabled={maintenanceMutation.isPending}
                    className={`rounded px-2 py-1 text-xs font-semibold disabled:opacity-50 ${
                      isMaintenance
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {maintenanceMutation.isPending
                      ? '...'
                      : isMaintenance
                        ? 'Desactivar'
                        : 'Activar'}
                  </button>
                </div>
                {isMaintenance && maintenanceMessage && (
                  <p className="mt-1 text-xs text-orange-600">{maintenanceMessage}</p>
                )}
                {showMaintMsg && !isMaintenance && (
                  <div className="mt-2 space-y-1.5">
                    <input
                      type="text"
                      value={maintenanceMsg}
                      onChange={(e) => setMaintenanceMsg(e.target.value)}
                      placeholder="Mensaje opcional para el admin..."
                      maxLength={500}
                      className="w-full rounded border border-orange-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        maintenanceMutation.mutate({
                          tenantId,
                          enabled: true,
                          message: maintenanceMsg || undefined,
                        })
                      }
                      disabled={maintenanceMutation.isPending}
                      className="w-full rounded bg-orange-500 py-1 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      {maintenanceMutation.isPending ? '...' : 'Confirmar mantenimiento'}
                    </button>
                  </div>
                )}
              </div>

              {tenant.status !== 'suspended' && tenant.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('suspend')}
                  disabled={updateMutation.isPending}
                  className="w-full rounded-md border border-yellow-300 px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                >
                  Suspender empresa
                </button>
              )}
              {tenant.status === 'suspended' && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('reactivate')}
                  disabled={updateMutation.isPending}
                  className="w-full rounded-md border border-green-300 px-3 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
                >
                  Reactivar empresa
                </button>
              )}
              {tenant.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('cancel')}
                  disabled={updateMutation.isPending}
                  className="w-full rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancelar empresa
                </button>
              )}
            </div>
          </div>

          {/* Health Score */}
          <HealthScorePanel tenantId={tenantId} />

          {/* Segmentos / Tags */}
          <TenantTagsEditor tenantId={tenantId} />

          {/* Historial de comunicaciones */}
          <CommunicationHistory tenantId={tenantId} />

          {/* Notas internas */}
          <TenantNotes tenantId={tenantId} />

          {/* Timeline */}
          <TenantTimeline tenantId={tenantId} />
        </div>

        {/* Licencias */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Licencias</h2>
          {licenses.length === 0 && <p className="text-sm text-gray-400">Sin licencias</p>}
          {licenses.map((lic) => (
            <LicenseCard key={lic.id} license={lic} tenantId={tenantId} onUpdated={refetch} />
          ))}
        </div>

        {/* Audit log */}
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Historial de auditoría</h2>
          <AuditLogTable tenantId={tenantId} />
        </div>
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Enviar email al admin</h3>
              </div>
              <button type="button" onClick={() => setShowEmailModal(false)} title="Cerrar">
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Asunto</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  maxLength={200}
                  placeholder="Ej: Aviso sobre tu cuenta BCWork"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Mensaje</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  maxLength={5000}
                  rows={5}
                  placeholder="Escribe el mensaje para el admin de la empresa..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-right text-xs text-gray-400">{emailBody.length}/5000</p>
              </div>
              {emailMutation.error && (
                <p className="text-xs text-red-500">{emailMutation.error.message}</p>
              )}
              {emailSentOk && (
                <p className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3.5 w-3.5" /> Email enviado correctamente
                </p>
              )}
            </div>
            <div className="flex gap-2 border-t border-gray-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!emailSubject.trim() || !emailBody.trim() || emailMutation.isPending}
                onClick={() =>
                  emailMutation.mutate({ tenantId, subject: emailSubject, body: emailBody })
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {emailMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {emailMutation.isPending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          tenantName={tenant.trade_name ?? tenant.legal_name}
          isPending={updateMutation.isPending}
          onConfirm={() =>
            updateMutation.mutate({
              id: tenantId,
              status: ACTION_CONFIG[confirmAction].newStatus as
                | 'active'
                | 'suspended'
                | 'cancelled',
            })
          }
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className={`text-right text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
