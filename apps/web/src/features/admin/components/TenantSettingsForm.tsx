'use client'

import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Check } from 'lucide-react'

export function TenantSettingsForm() {
  const { data, isLoading } = trpc.admin.getSettings.useQuery()
  const update = trpc.admin.updateSettings.useMutation()
  const [saved, setSaved] = useState(false)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== '' && v != null),
    )
    update.mutate(payload, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      },
    })
  }

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Info read-only */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Datos legales (solo lectura)</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Razón social" value={data?.legal_name ?? '—'} />
          <Row label="NIT" value={data?.nit ?? '—'} mono />
        </dl>
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
            <input
              type="text"
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              className="input"
              placeholder="America/Bogota"
            />
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

      <style>{`.input { width: 100%; border-radius: 6px; border: 1px solid #d1d5db; padding: 8px 12px; font-size: 14px; outline: none; } .input:focus { box-shadow: 0 0 0 2px #3b82f6; border-color: transparent; }`}</style>
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
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className={`mt-0.5 text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}
