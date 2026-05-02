'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, Trash2, Globe, Monitor, Info, Search } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Productivity = 'productive' | 'neutral' | 'non_productive'
type IdentifierType = 'process' | 'domain'
type Category =
  | 'communication'
  | 'development'
  | 'browsing'
  | 'entertainment'
  | 'productivity'
  | 'other'

const PRODUCTIVITY_STYLES: Record<Productivity, string> = {
  productive: 'bg-green-100 text-green-700',
  neutral: 'bg-amber-100 text-amber-700',
  non_productive: 'bg-red-100 text-red-700',
}
const PRODUCTIVITY_LABELS: Record<Productivity, string> = {
  productive: 'Productiva',
  neutral: 'Neutral',
  non_productive: 'No productiva',
}

const CATEGORY_LABELS: Record<Category, string> = {
  communication: 'Comunicación',
  development: 'Desarrollo',
  browsing: 'Navegación',
  entertainment: 'Entretenimiento',
  productivity: 'Productividad',
  other: 'Otro',
}
const CATEGORY_COLORS: Record<Category, string> = {
  communication: 'bg-blue-50 text-blue-700',
  development: 'bg-purple-50 text-purple-700',
  browsing: 'bg-sky-50 text-sky-700',
  entertainment: 'bg-pink-50 text-pink-700',
  productivity: 'bg-green-50 text-green-700',
  other: 'bg-gray-100 text-gray-500',
}

const EMPTY = {
  display_name: '',
  identifier: '',
  identifier_type: 'process' as IdentifierType,
  category: 'other' as Category,
  productivity: 'neutral' as Productivity,
}

// ── Componente ────────────────────────────────────────────────────────────────

export function AppCatalogManager() {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [filterProd, setFilterProd] = useState<Productivity | 'all'>('all')
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const [search, setSearch] = useState('')

  const utils = trpc.useUtils()
  const { data: rules, isLoading } = trpc.admin.listAppRules.useQuery()

  const upsert = trpc.admin.upsertAppRule.useMutation({
    onSuccess: () => {
      setForm(EMPTY)
      setCreating(false)
      void utils.admin.listAppRules.invalidate()
    },
  })
  const remove = trpc.admin.deleteAppRule.useMutation({
    onSuccess: () => void utils.admin.listAppRules.invalidate(),
  })

  const myRules = (rules ?? []).filter((r) => r.tenant_id != null)
  const globalRules = (rules ?? []).filter((r) => r.tenant_id == null)

  const filtered = myRules.filter((r) => {
    if (filterProd !== 'all' && r.productivity !== filterProd) return false
    if (filterCat !== 'all' && r.category !== filterCat) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.display_name?.toLowerCase().includes(q) ||
        r.identifier?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700">
          Clasifica cada aplicación o dominio web para que el agente calcule automáticamente la
          productividad de tu equipo. Las entradas marcadas como <strong>Productiva</strong> suman
          al índice de productividad; las <strong>No productivas</strong> lo reducen.
        </p>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filtro productividad */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(['all', 'productive', 'neutral', 'non_productive'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterProd(f)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                filterProd === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'Todas' : PRODUCTIVITY_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Filtro categoría */}
        <select
          title="Filtrar por categoría"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as Category | 'all')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todas las categorías</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        {/* Búsqueda */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar app..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Agregar app
        </button>
      </div>

      {/* Formulario de creación */}
      {creating && (
        <form
          className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            upsert.mutate(form)
          }}
        >
          <h3 className="text-sm font-semibold text-blue-900">Nueva clasificación de app</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nombre visible *
              </label>
              <input
                type="text"
                required
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="Google Chrome"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Proceso o dominio *
              </label>
              <input
                type="text"
                required
                value={form.identifier}
                onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))}
                placeholder={form.identifier_type === 'process' ? 'chrome.exe' : 'youtube.com'}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tipo *</label>
              <select
                title="Tipo de identificador"
                value={form.identifier_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, identifier_type: e.target.value as IdentifierType }))
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="process">Proceso (app de escritorio)</option>
                <option value="domain">Dominio (sitio web)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Categoría *</label>
              <select
                title="Categoría de la app"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Clasificación de productividad *
              </label>
              <div className="flex gap-2">
                {(['productive', 'neutral', 'non_productive'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, productivity: p }))}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-all ${
                      form.productivity === p
                        ? p === 'productive'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : p === 'neutral'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {PRODUCTIVITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {upsert.error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {upsert.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCreating(false)
                setForm(EMPTY)
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={upsert.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {upsert.isPending ? 'Guardando...' : 'Guardar clasificación'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="h-48 animate-pulse rounded-xl bg-gray-100" />}

      {/* Tabla de reglas del tenant */}
      {!isLoading && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Clasificaciones de tu empresa ({filtered.length})
            </h3>
            {myRules.length > 0 && filtered.length !== myRules.length && (
              <span className="text-xs text-gray-400">
                Mostrando {filtered.length} de {myRules.length}
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12 text-center">
              <Monitor className="mb-2 h-8 w-8 text-gray-300" />
              {myRules.length === 0 ? (
                <>
                  <p className="font-medium text-gray-400">Sin clasificaciones aún</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Agrega aplicaciones para que el agente sepa qué contar como productivo.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Ninguna app coincide con el filtro.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      App
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Identificador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Productividad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900">{r.display_name}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {r.identifier_type === 'domain' ? (
                            <Globe className="h-3.5 w-3.5 flex-shrink-0 text-sky-500" />
                          ) : (
                            <Monitor className="h-3.5 w-3.5 flex-shrink-0 text-purple-500" />
                          )}
                          <span className="font-mono text-xs text-gray-500">{r.identifier}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[r.category as Category] ?? 'bg-gray-100 text-gray-500'}`}
                        >
                          {CATEGORY_LABELS[r.category as Category] ?? r.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRODUCTIVITY_STYLES[r.productivity as Productivity] ?? ''}`}
                        >
                          {PRODUCTIVITY_LABELS[r.productivity as Productivity] ?? r.productivity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => remove.mutate({ id: r.id })}
                          disabled={remove.isPending}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Eliminar clasificación"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Reglas globales BCWork */}
      {globalRules.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Clasificaciones globales BCWork ({globalRules.length})
          </h3>
          <p className="mb-3 text-xs text-gray-400">
            Estas son las clasificaciones predefinidas de BCWork. Puedes sobreescribirlas agregando
            tu propia entrada con el mismo proceso.
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white opacity-70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    App
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Identificador
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Productividad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {globalRules.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 font-medium text-gray-700">{r.display_name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {r.identifier_type === 'domain' ? (
                          <Globe className="h-3.5 w-3.5 flex-shrink-0 text-sky-400" />
                        ) : (
                          <Monitor className="h-3.5 w-3.5 flex-shrink-0 text-purple-400" />
                        )}
                        <span className="font-mono text-xs text-gray-400">{r.identifier}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[r.category as Category] ?? 'bg-gray-100 text-gray-500'}`}
                      >
                        {CATEGORY_LABELS[r.category as Category] ?? r.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRODUCTIVITY_STYLES[r.productivity as Productivity] ?? ''}`}
                      >
                        {PRODUCTIVITY_LABELS[r.productivity as Productivity] ?? r.productivity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
