'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { FileText, Plus, X, Trash2, ExternalLink, AlertCircle } from 'lucide-react'

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  contract: { label: 'Contrato', color: 'text-blue-700', bg: 'bg-blue-100' },
  id: { label: 'Identificación', color: 'text-purple-700', bg: 'bg-purple-100' },
  certificate: { label: 'Certificado', color: 'text-green-700', bg: 'bg-green-100' },
  payslip: { label: 'Desprendible', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  letter: { label: 'Carta', color: 'text-orange-700', bg: 'bg-orange-100' },
  other: { label: 'Otro', color: 'text-gray-600', bg: 'bg-gray-100' },
}

function isExpiringSoon(dateStr: string | null) {
  if (!dateStr) return false
  const diff = new Date(dateStr).getTime() - Date.now()
  return diff > 0 && diff < 30 * 86400000
}

function isExpired(dateStr: string | null) {
  if (!dateStr) return false
  return new Date(dateStr).getTime() < Date.now()
}

export function EmployeeDocumentsPanel() {
  const utils = trpc.useUtils()
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')

  const [docTitle, setDocTitle] = useState('')
  const [docCategory, setDocCategory] = useState<keyof typeof CATEGORY_CONFIG>('contract')
  const [docUrl, setDocUrl] = useState('')
  const [docExpiry, setDocExpiry] = useState('')
  const [docNotes, setDocNotes] = useState('')
  const [docRequiresSignature, setDocRequiresSignature] = useState(false)

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id
  const { data: members } = trpc.manager.getTeamMembers.useQuery(
    { teamId: teamId! },
    { enabled: !!teamId },
  )
  const { data: docs, isLoading } = trpc.manager.getEmployeeDocuments.useQuery({
    employee_id: selectedEmployee ?? undefined,
  })

  const add = trpc.manager.addEmployeeDocument.useMutation({
    onSuccess: () => {
      utils.manager.getEmployeeDocuments.invalidate()
      setShowAdd(false)
      resetForm()
    },
  })
  const del = trpc.manager.deleteEmployeeDocument.useMutation({
    onSuccess: () => utils.manager.getEmployeeDocuments.invalidate(),
  })

  function resetForm() {
    setDocTitle('')
    setDocCategory('contract')
    setDocUrl('')
    setDocExpiry('')
    setDocNotes('')
    setDocRequiresSignature(false)
  }

  const memberList = (members ?? []) as any[]
  const allDocs = (docs ?? []) as any[]
  const filtered = filterCategory
    ? allDocs.filter((d: any) => d.category === filterCategory)
    : allDocs

  const expiringCount = allDocs.filter(
    (d: any) => isExpiringSoon(d.expiry_date) || isExpired(d.expiry_date),
  ).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Documentos del empleado</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Contratos, certificados y archivos importantes
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Agregar documento
        </button>
      </div>

      {expiringCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" />
          <p className="text-xs text-yellow-700">
            {expiringCount} {expiringCount === 1 ? 'documento vence' : 'documentos vencen'} pronto o
            ya vencieron
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedEmployee(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!selectedEmployee ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            Todos
          </button>
          {memberList.map((m: any) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedEmployee(m.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${selectedEmployee === m.id ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {m.full_name ?? m.email}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFilterCategory('')}
            className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${!filterCategory ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            Todas
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterCategory(filterCategory === k ? '' : k)}
              className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${filterCategory === k ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay documentos registrados</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Documento</th>
                <th className="px-4 py-2.5 text-left font-medium">Empleado</th>
                <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
                <th className="px-4 py-2.5 text-left font-medium">Vence</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filtered.map((d: any) => {
                const cat = CATEGORY_CONFIG[d.category as string] ?? {
                  label: d.category,
                  bg: 'bg-gray-100',
                  color: 'text-gray-600',
                }
                const expired = isExpired(d.expiry_date)
                const soon = isExpiringSoon(d.expiry_date)
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{d.title}</p>
                      {d.notes && <p className="text-xs text-gray-400">{d.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                          {(d.full_name ?? d.email ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-700">{d.full_name ?? d.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.bg} ${cat.color}`}
                      >
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.expiry_date ? (
                        <span
                          className={`text-xs font-medium ${expired ? 'text-red-600' : soon ? 'text-yellow-600' : 'text-gray-500'}`}
                        >
                          {expired ? '⚠ ' : soon ? '⏰ ' : ''}
                          {new Date(d.expiry_date).toLocaleDateString('es-CO')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {d.file_url && (
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded p-1 text-gray-300 hover:text-blue-500"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => del.mutate({ id: d.id })}
                          className="rounded p-1 text-gray-300 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Agregar documento</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false)
                  resetForm()
                }}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Empleado</label>
                <select
                  value={selectedEmployee ?? ''}
                  onChange={(e) => setSelectedEmployee(e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {memberList.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name ?? m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Título</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Ej: Contrato indefinido 2024"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Tipo</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as keyof typeof CATEGORY_CONFIG)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Fecha vence</label>
                  <input
                    type="date"
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">
                  URL del archivo (opcional)
                </label>
                <input
                  type="text"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Notas (opcional)</label>
                <textarea
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={docRequiresSignature}
                  onChange={(e) => setDocRequiresSignature(e.target.checked)}
                  className="h-3.5 w-3.5 rounded"
                />
                Requiere firma del empleado
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false)
                  resetForm()
                }}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedEmployee || !docTitle.trim() || add.isPending}
                onClick={() =>
                  add.mutate({
                    employee_id: selectedEmployee!,
                    title: docTitle.trim(),
                    category: docCategory as
                      | 'contract'
                      | 'id'
                      | 'certificate'
                      | 'payslip'
                      | 'letter'
                      | 'other',
                    file_url: docUrl || undefined,
                    expiry_date: docExpiry || undefined,
                    notes: docNotes || undefined,
                    requires_signature: docRequiresSignature || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
