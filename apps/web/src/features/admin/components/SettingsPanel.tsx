'use client'

import { useEffect, useRef, useState } from 'react'
import { trpc as api } from '@/lib/trpc-client'
import { Check, Upload, X, Bell, Plug, AlertTriangle, Building2 } from 'lucide-react'
import { IntegrationsManager } from './IntegrationsManager'

type Tab = 'general' | 'notifications' | 'integrations' | 'danger'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'integrations', label: 'Integraciones', icon: Plug },
  { id: 'danger', label: 'Zona de peligro', icon: AlertTriangle },
]

const NOTIF_LABELS: Record<string, string> = {
  absence_approved: 'Email al empleado cuando su ausencia es aprobada',
  absence_rejected: 'Email al empleado cuando su ausencia es rechazada',
  absence_request: 'Email al manager cuando recibe una solicitud de ausencia',
  payslip_issued: 'Email al empleado cuando se emite su colilla de nómina',
  weekly_report: 'Reporte semanal de actividad al admin (cada lunes)',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-0.5 text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  )
}

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab() {
  const utils = api.useUtils()
  const { data, isLoading } = api.admin.getSettings.useQuery()
  const update = api.admin.updateSettings.useMutation({
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      void utils.admin.getSettings.invalidate()
    },
  })
  const uploadLogo = api.admin.uploadLogo.useMutation({
    onSuccess: () => void utils.admin.getSettings.invalidate(),
    onError: (err) => setLogoError(err.message),
  })

  const [saved, setSaved] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    trade_name: '',
    contact_email: '',
    contact_phone: '',
    timezone: '',
    data_retention_months: 12,
    data_protection_officer: '',
  })

  useEffect(() => {
    if (data) {
      setForm({
        trade_name: data.trade_name ?? '',
        contact_email: data.contact_email ?? '',
        contact_phone: data.contact_phone ?? '',
        timezone: data.timezone ?? '',
        data_retention_months: data.data_retention_months ?? 12,
        data_protection_officer: data.data_protection_officer ?? '',
      })
    }
  }, [data])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError(null)
    if (file.size > 512 * 1024) {
      setLogoError('El archivo no puede superar 512 KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setLogoPreview(result)
      const base64 = result.split(',')[1]!
      uploadLogo.mutate({
        base64,
        mimeType: file.type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml',
      })
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    setLogoPreview(null)
    update.mutate({ logo_url: undefined })
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== '' && v != null),
    )
    update.mutate(payload)
  }

  const currentLogo = logoPreview ?? data?.logo_url

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />

  return (
    <div className="max-w-2xl space-y-6">
      {/* Logo */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Logo de la empresa</h2>
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-40 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
            {currentLogo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentLogo}
                  alt="Logo"
                  className="max-h-full max-w-full object-contain p-2"
                />
                {!uploadLogo.isPending && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute right-1 top-1 rounded-full bg-white/80 p-0.5 text-gray-500 shadow hover:bg-white hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">Sin logo</span>
            )}
            {uploadLogo.isPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="text-xs text-blue-600">Subiendo...</span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoChange}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              {currentLogo ? 'Cambiar logo' : 'Subir logo'}
            </label>
            <p className="text-xs text-gray-400">PNG, JPG, WebP o SVG · Máx. 512 KB</p>
            {logoError && <p className="text-xs text-red-600">{logoError}</p>}
          </div>
        </div>
      </div>

      {/* Datos legales */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Datos legales (solo lectura)</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Razón social" value={data?.legal_name ?? '—'} />
          <Row label="NIT" value={data?.nit ?? '—'} mono />
        </div>
      </div>

      {/* Editable */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-gray-700">Datos editables</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre comercial">
            <input
              type="text"
              value={form.trade_name}
              onChange={(e) => setForm((f) => ({ ...f, trade_name: e.target.value }))}
              className="input"
              placeholder="Mi Empresa SAS"
            />
          </Field>
          <Field label="Email de contacto">
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
              className="input"
              placeholder="admin@empresa.com"
            />
          </Field>
          <Field label="Teléfono">
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
              className="input"
              placeholder="+57 300 000 0000"
            />
          </Field>
          <Field label="Zona horaria">
            <select
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              className="input"
              title="Zona horaria"
            >
              <option value="America/Bogota">América/Bogotá (UTC-5)</option>
              <option value="America/New_York">América/Nueva York</option>
              <option value="America/Mexico_City">América/Ciudad de México</option>
              <option value="America/Lima">América/Lima</option>
              <option value="America/Santiago">América/Santiago</option>
              <option value="America/Buenos_Aires">América/Buenos Aires</option>
              <option value="Europe/Madrid">Europa/Madrid</option>
            </select>
          </Field>
        </div>
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Cumplimiento HABEAS DATA — Ley 1581/2012
          </h3>
          <Field label="Oficial de Protección de Datos">
            <input
              type="text"
              value={form.data_protection_officer}
              onChange={(e) => setForm((f) => ({ ...f, data_protection_officer: e.target.value }))}
              className="input"
              placeholder="Nombre y cargo del responsable"
            />
          </Field>
          <Field label={`Retención de datos (meses): ${form.data_retention_months}`}>
            <input
              type="range"
              min={12}
              max={84}
              step={12}
              value={form.data_retention_months}
              aria-label="Retención de datos en meses"
              onChange={(e) =>
                setForm((f) => ({ ...f, data_retention_months: Number(e.target.value) }))
              }
              className="w-full accent-amber-500"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>12 m</span>
              <span>36 m</span>
              <span>60 m</span>
              <span>84 m</span>
            </div>
          </Field>
        </div>
        {update.error && <p className="text-sm text-red-600">{update.error.message}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={update.isPending}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {update.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" /> Guardado
            </span>
          )}
        </div>
      </form>
      <style>{`.input { width: 100%; border-radius: 6px; border: 1px solid #d1d5db; padding: 8px 12px; font-size: 14px; outline: none; background: white; } .input:focus { box-shadow: 0 0 0 2px #3b82f6; border-color: transparent; }`}</style>
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const utils = api.useUtils()
  const { data, isLoading } = api.admin.getNotificationPreferences.useQuery()
  const update = api.admin.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      void utils.admin.getNotificationPreferences.invalidate()
    },
  })
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setPrefs(data)
  }, [data])

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Notificaciones por email</h2>
        <p className="mb-4 text-xs text-gray-400">
          Controla qué emails automáticos envía BCWork a tu equipo.
        </p>
        <div className="divide-y divide-gray-50">
          {Object.entries(NOTIF_LABELS).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between gap-4 py-3"
            >
              <span className="text-sm text-gray-700">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[key] ?? false}
                onClick={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${prefs[key] ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${prefs[key] ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => update.mutate(prefs)}
            disabled={update.isPending}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {update.isPending ? 'Guardando...' : 'Guardar preferencias'}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" /> Guardado
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

function IntegrationsTab() {
  return <IntegrationsManager />
}

// ─── Danger Zone Tab ──────────────────────────────────────────────────────────

function DangerTab() {
  const [confirm, setConfirm] = useState('')
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [exportDone, setExportDone] = useState(false)

  const exportData = api.admin.exportData.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bcwork-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportDone(true)
      setTimeout(() => setExportDone(false), 4000)
    },
  })

  const cancelSub = api.admin.cancelSubscription.useMutation({
    onSuccess: () => {
      setCancelConfirm(false)
      window.location.href = '/login'
    },
  })

  const deleteAccount = api.admin.deleteAccount.useMutation({
    onSuccess: () => {
      window.location.href = '/login'
    },
  })

  return (
    <div className="max-w-2xl space-y-4">
      {/* Exportar */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-800">Exportar todos los datos</h2>
        <p className="mb-3 text-xs text-gray-500">
          Descarga un archivo JSON con toda la información de tu empresa: empleados, sesiones,
          ausencias, nómina, proyectos y más.
        </p>
        {exportData.error && (
          <p className="mb-2 text-xs text-red-600">{exportData.error.message}</p>
        )}
        <button
          type="button"
          disabled={exportData.isPending}
          onClick={() => exportData.mutate()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {exportData.isPending
            ? 'Generando exportación…'
            : exportDone
              ? '✓ Descarga iniciada'
              : 'Descargar exportación'}
        </button>
      </div>

      {/* Cancelar suscripción */}
      <div className="rounded-xl border border-red-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-red-700">Cancelar suscripción</h2>
        <p className="mb-3 text-xs text-gray-500">
          Tu cuenta pasará a estado <strong>cancelado</strong>. Los datos se conservan 30 días antes
          de eliminarse permanentemente.
        </p>
        {cancelSub.error && <p className="mb-2 text-xs text-red-600">{cancelSub.error.message}</p>}
        {!cancelConfirm ? (
          <button
            type="button"
            onClick={() => setCancelConfirm(true)}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Cancelar suscripción
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">¿Confirmas la cancelación?</span>
            <button
              type="button"
              disabled={cancelSub.isPending}
              onClick={() => cancelSub.mutate()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {cancelSub.isPending ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
            <button
              type="button"
              onClick={() => setCancelConfirm(false)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              No, volver
            </button>
          </div>
        )}
      </div>

      {/* Eliminar cuenta */}
      <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5">
        <h2 className="mb-1 text-sm font-semibold text-red-800">Eliminar cuenta permanentemente</h2>
        <p className="mb-3 text-xs text-red-700">
          Esta acción es <strong>irreversible</strong>. Se eliminarán todos los datos: empleados,
          registros de actividad, nómina, documentos y configuraciones.
        </p>
        <p className="mb-2 text-xs text-gray-700">
          Escribe <strong>ELIMINAR</strong> para confirmar:
        </p>
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mb-3 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="ELIMINAR"
        />
        {deleteAccount.error && (
          <p className="mb-2 text-xs text-red-600">{deleteAccount.error.message}</p>
        )}
        <button
          type="button"
          disabled={confirm !== 'ELIMINAR' || deleteAccount.isPending}
          onClick={() => deleteAccount.mutate({ confirmation: 'ELIMINAR' })}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleteAccount.isPending ? 'Eliminando todo…' : 'Eliminar cuenta permanentemente'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SettingsPanel() {
  const [tab, setTab] = useState<Tab>('general')

  return (
    <div className="flex gap-6">
      {/* Sidebar tabs */}
      <nav className="w-48 shrink-0 space-y-1">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              } ${t.id === 'danger' && !active ? 'text-red-500 hover:bg-red-50' : ''}`}
            >
              <Icon className={`h-4 w-4 ${t.id === 'danger' ? 'text-red-400' : ''}`} />
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {tab === 'general' && <GeneralTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'integrations' && <IntegrationsTab />}
        {tab === 'danger' && <DangerTab />}
      </div>
    </div>
  )
}
