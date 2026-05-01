'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, Trash2, AppWindow } from 'lucide-react'

type Rule = 'allow' | 'block' | 'monitor'

const RULE_STYLES: Record<Rule, string> = {
  allow: 'bg-green-100 text-green-700',
  block: 'bg-red-100 text-red-700',
  monitor: 'bg-yellow-100 text-yellow-700',
}
const RULE_LABELS: Record<Rule, string> = {
  allow: 'Permitida',
  block: 'Bloqueada',
  monitor: 'Monitorear',
}

const EMPTY = { name: '', process_name: '', category: '', rule: 'monitor' as Rule }

export function AppCatalogManager() {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [filter, setFilter] = useState<Rule | 'all'>('all')

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
    onSuccess: () => utils.admin.listAppRules.invalidate(),
  })

  const tenantId = rules?.find((r) => r.tenant_id != null)?.tenant_id
  const filtered = (rules ?? []).filter(
    (r) => (filter === 'all' || r.rule === filter) && r.tenant_id != null,
  )
  const globalRules = (rules ?? []).filter((r) => r.tenant_id == null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(['all', 'allow', 'block', 'monitor'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                filter === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'Todas' : RULE_LABELS[f]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Agregar regla
        </button>
      </div>

      {creating && (
        <form
          className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            upsert.mutate({
              name: form.name,
              category: form.category,
              rule: form.rule,
              ...(form.process_name ? { process_name: form.process_name } : {}),
            })
          }}
        >
          <h3 className="text-sm font-semibold text-blue-800">Nueva regla</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nombre *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Chrome"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Proceso (opcional)
              </label>
              <input
                type="text"
                value={form.process_name}
                onChange={(e) => setForm((f) => ({ ...f, process_name: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="chrome.exe"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Categoría *</label>
              <input
                type="text"
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Navegador"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Regla *</label>
              <select
                value={form.rule}
                onChange={(e) => setForm((f) => ({ ...f, rule: e.target.value as Rule }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="allow">Permitida</option>
                <option value="monitor">Monitorear</option>
                <option value="block">Bloqueada</option>
              </select>
            </div>
          </div>
          {upsert.error && <p className="text-sm text-red-600">{upsert.error.message}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={upsert.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {upsert.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="h-48 animate-pulse rounded-xl bg-gray-100" />}

      {/* Reglas del tenant */}
      {filtered.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Reglas de tu empresa
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">App</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Proceso</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Regla</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                      {r.process_name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{r.category}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${RULE_STYLES[r.rule as Rule] ?? ''}`}
                      >
                        {RULE_LABELS[r.rule as Rule] ?? r.rule}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.tenant_id === tenantId && (
                        <button
                          onClick={() => remove.mutate({ id: r.id })}
                          disabled={remove.isPending}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reglas globales */}
      {globalRules.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Reglas globales BCWork
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white opacity-70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">App</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Regla</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {globalRules.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 text-gray-700">{r.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.category}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${RULE_STYLES[r.rule as Rule] ?? ''}`}
                      >
                        {RULE_LABELS[r.rule as Rule] ?? r.rule}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!isLoading && filtered.length === 0 && globalRules.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12">
          <AppWindow className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Sin reglas de aplicaciones. Agrega la primera.</p>
        </div>
      )}
    </div>
  )
}
