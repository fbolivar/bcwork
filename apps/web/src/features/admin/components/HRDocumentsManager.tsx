'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { FileText, Plus, X, Trash2, FileCheck, GraduationCap, Mail, FolderOpen } from 'lucide-react'

type DocType = 'contract' | 'policy' | 'certificate' | 'letter' | 'other'

const DOC_TYPE_MAP: Record<DocType, { label: string; icon: React.ReactNode }> = {
  contract: { label: 'Contrato', icon: <FileCheck className="h-4 w-4" /> },
  policy: { label: 'Política', icon: <FileText className="h-4 w-4" /> },
  certificate: { label: 'Certificado', icon: <GraduationCap className="h-4 w-4" /> },
  letter: { label: 'Carta', icon: <Mail className="h-4 w-4" /> },
  other: { label: 'Otro', icon: <FolderOpen className="h-4 w-4" /> },
}

export function HRDocumentsManager() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState<DocType>('contract')
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')

  const { data: docs, isLoading } = trpc.admin.getHRDocuments.useQuery({
    employee_id: filterEmployee || undefined,
  })
  const { data: usersData } = trpc.admin.listUsers.useQuery({ pageSize: 100 })

  const create = trpc.admin.createHRDocument.useMutation({
    onSuccess: () => {
      utils.admin.getHRDocuments.invalidate()
      setShowCreate(false)
      setTitle('')
      setFileUrl('')
      setFileName('')
      setExpiresAt('')
      setEmployeeId('')
    },
  })

  const remove = trpc.admin.deleteHRDocument.useMutation({
    onSuccess: () => utils.admin.getHRDocuments.invalidate(),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Documentos HR</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Contratos, políticas y certificados del equipo
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo documento
        </button>
      </div>

      <div className="flex gap-2">
        <select
          title="Filtrar por empleado"
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Todos los empleados</option>
          <option value="__company__">Solo empresa (globales)</option>
          {(usersData?.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : ((docs ?? []) as any[]).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay documentos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {((docs ?? []) as any[]).map((raw) => {
            type DocRow = {
              id: string
              title: string
              doc_type: string
              file_url: string | null
              file_name: string | null
              expires_at: string | null
              employee_id: string | null
              created_at: string
              users?: { full_name: string } | null
            }
            const d = raw as DocRow
            const typeInfo = DOC_TYPE_MAP[d.doc_type as DocType] ?? DOC_TYPE_MAP.other
            const isExpired = d.expires_at ? new Date(d.expires_at) < new Date() : false
            return (
              <div
                key={d.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${isExpired ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-white'}`}
              >
                <div className="text-gray-500">{typeInfo.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{d.title}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {typeInfo.label}
                    {d.users ? ` · ${d.users.full_name}` : ' · Toda la empresa'}
                    {d.expires_at &&
                      ` · Vence ${new Date(d.expires_at + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>
                {d.file_url && (
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Abrir
                  </a>
                )}
                <button
                  type="button"
                  title="Eliminar"
                  onClick={() => remove.mutate({ id: d.id })}
                  disabled={remove.isPending}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nuevo documento HR</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="hrd-title" className="text-xs font-medium text-gray-700">
                  Título
                </label>
                <input
                  id="hrd-title"
                  type="text"
                  placeholder="Ej: Contrato Laboral 2025"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="hrd-type" className="text-xs font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    id="hrd-type"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocType)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {Object.entries(DOC_TYPE_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="hrd-employee" className="text-xs font-medium text-gray-700">
                    Empleado
                  </label>
                  <select
                    id="hrd-employee"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Toda la empresa</option>
                    {(usersData?.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="hrd-url" className="text-xs font-medium text-gray-700">
                  URL del archivo
                </label>
                <input
                  id="hrd-url"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="hrd-filename" className="text-xs font-medium text-gray-700">
                  Nombre del archivo (opcional)
                </label>
                <input
                  id="hrd-filename"
                  type="text"
                  placeholder="contrato-2025.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="hrd-expires" className="text-xs font-medium text-gray-700">
                  Fecha de vencimiento (opcional)
                </label>
                <input
                  id="hrd-expires"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!title.trim() || create.isPending}
                onClick={() =>
                  create.mutate({
                    title,
                    doc_type: docType,
                    file_url: fileUrl || undefined,
                    file_name: fileName || undefined,
                    expires_at: expiresAt || undefined,
                    employee_id: employeeId || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
