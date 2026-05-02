'use client'

import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Check, Upload, X } from 'lucide-react'

export function TenantSettingsForm() {
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.admin.getSettings.useQuery()
  const update = trpc.admin.updateSettings.useMutation({
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      void utils.admin.getSettings.invalidate()
    },
  })
  const uploadLogo = trpc.admin.uploadLogo.useMutation({
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
      const mimeType = file.type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml'
      uploadLogo.mutate({ base64, mimeType })
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

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
  }

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
                    title="Quitar logo"
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
            <p className="text-xs text-gray-400">
              Se usará en encabezados y pies de página de los reportes.
            </p>
            {logoError && <p className="text-xs text-red-600">{logoError}</p>}
          </div>
        </div>
      </div>

      {/* Info read-only */}
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
