'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { keepPreviousData } from '@tanstack/react-query'
import { Plus, X, CheckCircle2, Pencil } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { StatusBadge } from './StatusBadge'
import { formatCOP, formatDate, daysUntil } from '@/lib/format'

const EMPTY_FORM = {
  legal_name: '',
  trade_name: '',
  nit: '',
  contact_email: '',
  contact_phone: '',
  admin_full_name: '',
  admin_password: '',
  plan_code: 'pro' as 'basic' | 'pro' | 'enterprise' | 'custom',
  seats: 10,
  status: 'trial' as 'trial' | 'active',
  trial_days: 14,
}

function NewTenantModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils()
  const [form, setForm] = useState(EMPTY_FORM)
  const [done, setDone] = useState<{ tenantId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = trpc.platform.createTenant.useMutation({
    onSuccess: (data) => {
      setDone(data)
      utils.platform.listTenants.invalidate()
    },
    onError: (err) => setError(err.message),
  })

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  if (done) {
    return (
      <Overlay>
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h2 className="text-lg font-bold text-gray-900">Empresa creada</h2>
          <p className="mt-2 text-sm text-gray-500">
            La cuenta de administrador fue creada con el correo y contraseña que ingresaste.
            Compártelos con tu cliente para que pueda ingresar.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </Overlay>
    )
  }

  return (
    <Overlay>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">Nueva empresa cliente</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Datos empresa */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Datos de la empresa
            </legend>
            <Row label="Razón social *">
              <input
                value={form.legal_name}
                onChange={(e) => set('legal_name', e.target.value)}
                required
                className={inp}
                placeholder="BC Seguridad SAS"
              />
            </Row>
            <Row label="Nombre comercial">
              <input
                value={form.trade_name}
                onChange={(e) => set('trade_name', e.target.value)}
                className={inp}
                placeholder="BC Seguridad"
              />
            </Row>
            <Row label="NIT *">
              <input
                value={form.nit}
                onChange={(e) => set('nit', e.target.value)}
                required
                className={inp}
                placeholder="900123456-7"
                title="Formato: 900123456-7"
              />
            </Row>
            <Row label="Email de contacto *">
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => set('contact_email', e.target.value)}
                required
                className={inp}
                placeholder="admin@empresa.com"
              />
            </Row>
            <Row label="Teléfono">
              <input
                value={form.contact_phone}
                onChange={(e) => set('contact_phone', e.target.value)}
                className={inp}
                placeholder="+57 300 000 0000"
              />
            </Row>
          </fieldset>

          {/* Admin */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Usuario administrador
            </legend>
            <Row label="Nombre completo *">
              <input
                value={form.admin_full_name}
                onChange={(e) => set('admin_full_name', e.target.value)}
                required
                className={inp}
                placeholder="Juan Pérez"
              />
            </Row>
            <Row label="Contraseña *">
              <input
                type="password"
                value={form.admin_password}
                onChange={(e) => set('admin_password', e.target.value)}
                required
                className={inp}
                placeholder="Mín. 12 chars, mayús, núm, símbolo"
              />
            </Row>
          </fieldset>

          {/* Licencia */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Licencia
            </legend>
            <Row label="Plan">
              <select
                value={form.plan_code}
                title="Plan de licencia"
                onChange={(e) => set('plan_code', e.target.value as typeof form.plan_code)}
                className={inp}
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
                <option value="custom">Personalizado (Perpetuo)</option>
              </select>
            </Row>
            <Row label="Seats (usuarios)">
              <input
                type="number"
                min={1}
                max={5000}
                value={form.seats}
                title="Número de usuarios permitidos"
                placeholder="10"
                onChange={(e) => set('seats', Number(e.target.value))}
                className={inp}
              />
            </Row>
            {form.plan_code !== 'custom' && (
              <>
                <Row label="Estado inicial">
                  <select
                    value={form.status}
                    title="Estado inicial de la licencia"
                    onChange={(e) => set('status', e.target.value as typeof form.status)}
                    className={inp}
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Activo (pagado)</option>
                  </select>
                </Row>
                {form.status === 'trial' && (
                  <Row label="Días de trial">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={form.trial_days}
                      title="Duración del período de prueba en días"
                      placeholder="14"
                      onChange={(e) => set('trial_days', Number(e.target.value))}
                      className={inp}
                    />
                  </Row>
                )}
              </>
            )}
            {form.plan_code === 'custom' && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Licencia perpetua — sin fecha de vencimiento, estado activo desde el inicio.
              </p>
            )}
          </fieldset>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={create.isPending}
            onClick={() => {
              setError(null)
              create.mutate(form)
            }}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {create.isPending ? 'Creando...' : 'Crear empresa'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function EditTenantModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const utils = trpc.useUtils()
  const { data: tenant, isLoading } = trpc.platform.getTenant.useQuery({ id: tenantId })
  const { data: plans } = trpc.platform.listPlans.useQuery()

  const [tab, setTab] = useState<'empresa' | 'licencia' | 'config'>('empresa')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Empresa form
  const [empresa, setEmpresa] = useState({
    trade_name: '',
    contact_email: '',
    contact_phone: '',
    timezone: 'America/Bogota',
    status: 'trial' as 'trial' | 'active' | 'suspended' | 'cancelled',
  })

  // Licencia form
  const [licencia, setLicencia] = useState({
    licenseId: '',
    plan_id: '',
    seats_total: 10,
    status: 'trial' as 'active' | 'suspended' | 'cancelled' | 'trial',
    ends_at: '',
  })

  // Config form
  const [config, setConfig] = useState({
    data_retention_months: 24,
    data_protection_officer: '',
  })

  useEffect(() => {
    if (!tenant) return
    setEmpresa({
      trade_name: tenant.trade_name ?? '',
      contact_email: tenant.contact_email,
      contact_phone: (tenant.contact_phone as string | null) ?? '',
      timezone: tenant.timezone ?? 'America/Bogota',
      status: (tenant.status as typeof empresa.status) ?? 'trial',
    })
    setConfig({
      data_retention_months: tenant.data_retention_months ?? 24,
      data_protection_officer: (tenant.data_protection_officer as string | null) ?? '',
    })
    const lic = (
      tenant.licenses as Array<{
        id: string
        plan_id: string
        seats_total: number
        status: string
        ends_at: string
        trial_ends_at: string | null
      }>
    )?.[0]
    if (lic) {
      setLicencia({
        licenseId: lic.id,
        plan_id: lic.plan_id,
        seats_total: lic.seats_total,
        status: lic.status as typeof licencia.status,
        ends_at: (lic.trial_ends_at ?? lic.ends_at ?? '').slice(0, 10),
      })
    }
  }, [tenant])

  const updateTenant = trpc.platform.updateTenant.useMutation()
  const updateLicense = trpc.platform.updateLicense.useMutation()

  async function handleSave() {
    setError(null)
    try {
      // Always save tenant fields (empresa + config in one call)
      await updateTenant.mutateAsync({
        id: tenantId,
        trade_name: empresa.trade_name || undefined,
        contact_email: empresa.contact_email || undefined,
        contact_phone: empresa.contact_phone || undefined,
        timezone: empresa.timezone || undefined,
        status: empresa.status,
        data_retention_months: config.data_retention_months,
        data_protection_officer: config.data_protection_officer || undefined,
      })

      // Also save license if one exists
      if (licencia.licenseId) {
        await updateLicense.mutateAsync({
          licenseId: licencia.licenseId,
          plan_id: licencia.plan_id || undefined,
          seats_total: licencia.seats_total,
          status: licencia.status === 'trial' ? undefined : licencia.status,
          ends_at: licencia.ends_at ? new Date(licencia.ends_at).toISOString() : undefined,
        })
      }

      await utils.platform.listTenants.invalidate()
      await utils.platform.getTenant.invalidate({ id: tenantId })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      console.error('[EditTenantModal] save error:', e)
      setError(msg)
    }
  }

  const isPending = updateTenant.isPending || updateLicense.isPending

  return (
    <Overlay>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isLoading
                ? 'Cargando...'
                : (tenant?.trade_name ?? tenant?.legal_name ?? 'Editar empresa')}
            </h2>
            {tenant && <p className="text-xs text-gray-400">NIT: {tenant.nit}</p>}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['empresa', 'licencia', 'config'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t)
                setError(null)
                setSaved(false)
              }}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'empresa' ? 'Empresa' : t === 'licencia' ? 'Licencia' : 'Configuración'}
            </button>
          ))}
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          {isLoading && <div className="h-40 animate-pulse rounded-xl bg-gray-100" />}

          {!isLoading && tab === 'empresa' && (
            <div className="space-y-3">
              <Row label="Razón social">
                <input
                  value={tenant?.legal_name ?? ''}
                  readOnly
                  title="Razón social"
                  className={`${inp} bg-gray-50 text-gray-400`}
                />
              </Row>
              <Row label="Nombre comercial">
                <input
                  value={empresa.trade_name}
                  onChange={(e) => setEmpresa((f) => ({ ...f, trade_name: e.target.value }))}
                  title="Nombre comercial"
                  className={inp}
                  placeholder="Nombre comercial"
                />
              </Row>
              <Row label="NIT">
                <input
                  value={tenant?.nit ?? ''}
                  readOnly
                  title="NIT"
                  className={`${inp} bg-gray-50 font-mono text-gray-400`}
                />
              </Row>
              <Row label="Email contacto">
                <input
                  type="email"
                  value={empresa.contact_email}
                  onChange={(e) => setEmpresa((f) => ({ ...f, contact_email: e.target.value }))}
                  title="Email de contacto"
                  placeholder="admin@empresa.com"
                  className={inp}
                />
              </Row>
              <Row label="Teléfono">
                <input
                  value={empresa.contact_phone}
                  onChange={(e) => setEmpresa((f) => ({ ...f, contact_phone: e.target.value }))}
                  className={inp}
                  placeholder="+57 300 000 0000"
                />
              </Row>
              <Row label="Timezone">
                <select
                  value={empresa.timezone}
                  onChange={(e) => setEmpresa((f) => ({ ...f, timezone: e.target.value }))}
                  title="Zona horaria"
                  className={inp}
                >
                  <option value="America/Bogota">America/Bogota</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Mexico_City">America/Mexico_City</option>
                  <option value="America/Lima">America/Lima</option>
                  <option value="UTC">UTC</option>
                </select>
              </Row>
              <Row label="Estado empresa">
                <select
                  value={empresa.status}
                  onChange={(e) =>
                    setEmpresa((f) => ({ ...f, status: e.target.value as typeof empresa.status }))
                  }
                  title="Estado de la empresa"
                  className={inp}
                >
                  <option value="trial">Trial</option>
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </Row>
            </div>
          )}

          {!isLoading && tab === 'licencia' && (
            <div className="space-y-3">
              <Row label="Plan">
                <select
                  value={licencia.plan_id}
                  onChange={(e) => setLicencia((f) => ({ ...f, plan_id: e.target.value }))}
                  title="Plan de licencia"
                  className={inp}
                >
                  {(plans ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCOP(p.monthly_price_per_seat_cop)}/seat
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="Seats (usuarios)">
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={licencia.seats_total}
                  onChange={(e) =>
                    setLicencia((f) => ({ ...f, seats_total: Number(e.target.value) }))
                  }
                  className={inp}
                  title="Número de usuarios"
                />
              </Row>
              <Row label="Estado licencia">
                <select
                  value={licencia.status}
                  onChange={(e) =>
                    setLicencia((f) => ({ ...f, status: e.target.value as typeof licencia.status }))
                  }
                  title="Estado de la licencia"
                  className={inp}
                >
                  <option value="trial">Trial</option>
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </Row>
              <Row label="Vence">
                <div className="space-y-1">
                  <input
                    type="date"
                    value={licencia.ends_at}
                    onChange={(e) => setLicencia((f) => ({ ...f, ends_at: e.target.value }))}
                    className={inp}
                    title="Fecha de vencimiento (vacío = perpetua)"
                    placeholder="Dejar vacío para perpetua"
                  />
                  {!licencia.ends_at && (
                    <p className="text-xs text-blue-600">Sin vencimiento — licencia perpetua</p>
                  )}
                </div>
              </Row>
            </div>
          )}

          {!isLoading && tab === 'config' && (
            <div className="space-y-3">
              <Row label="Retención de datos">
                <div className="space-y-1">
                  <input
                    type="range"
                    min={12}
                    max={84}
                    step={6}
                    value={config.data_retention_months}
                    onChange={(e) =>
                      setConfig((f) => ({ ...f, data_retention_months: Number(e.target.value) }))
                    }
                    className="w-full"
                    title="Meses de retención"
                  />
                  <p className="text-right text-xs text-gray-500">
                    {config.data_retention_months} meses
                  </p>
                </div>
              </Row>
              <Row label="Oficial HABEAS DATA">
                <input
                  value={config.data_protection_officer}
                  onChange={(e) =>
                    setConfig((f) => ({ ...f, data_protection_officer: e.target.value }))
                  }
                  className={inp}
                  placeholder="Nombre del oficial"
                />
              </Row>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {saved && (
            <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Guardado correctamente
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={isPending || isLoading}
            onClick={handleSave}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-40 shrink-0 text-xs text-gray-500">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  )
}

const inp =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function TenantTable() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'trial' | 'active' | 'suspended' | 'cancelled'>(
    'all',
  )
  const [page, setPage] = useState(1)
  const [showNew, setShowNew] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const { data, isLoading } = trpc.platform.listTenants.useQuery(
    { search: search || undefined, status, page, pageSize: 20 },
    { placeholderData: keepPreviousData },
  )

  return (
    <div className="space-y-4">
      {showNew && <NewTenantModal onClose={() => setShowNew(false)} />}
      {editId && <EditTenantModal tenantId={editId} onClose={() => setEditId(null)} />}

      {/* Filtros + botón nueva empresa */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Buscar por nombre, NIT o email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          title="Filtrar por estado"
          onChange={(e) => {
            setStatus(e.target.value as typeof status)
            setPage(1)
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos</option>
          <option value="trial">Trial</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
          <option value="cancelled">Cancelados</option>
        </select>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva empresa
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Empresa</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">NIT</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Seats</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">MRR</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Vence</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!isLoading && (data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {(data?.data ?? []).map((tenant) => {
              const license = (
                tenant.licenses as unknown as Array<{
                  id: string
                  status: string
                  seats_total: number
                  plan_id: string
                  ends_at: string
                  trial_ends_at: string | null
                  plans: { code: string; name: string; monthly_price_per_seat_cop: number } | null
                }>
              )?.[0]
              const mrr = license
                ? (license.plans?.monthly_price_per_seat_cop ?? 0) * license.seats_total
                : 0
              const endDate = license?.trial_ends_at ?? license?.ends_at

              return (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/super-admin/tenants/${tenant.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {tenant.trade_name ?? tenant.legal_name}
                    </Link>
                    <p className="text-xs text-gray-400">{tenant.contact_email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{tenant.nit}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium uppercase">
                      {license?.plans?.code ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{license?.seats_total ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {license?.status === 'active' ? formatCOP(mrr) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={license?.status ?? tenant.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {license && license.ends_at === null ? (
                      <span className="font-medium text-blue-600">Perpetua</span>
                    ) : endDate ? (
                      <>
                        {formatDate(endDate)}
                        {daysUntil(endDate) > 0 && (
                          <span className="ml-1 text-gray-400">({daysUntil(endDate)}d)</span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setEditId(tenant.id)}
                      title="Editar empresa"
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} de{' '}
            {data.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * data.pageSize >= data.total}
              className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
