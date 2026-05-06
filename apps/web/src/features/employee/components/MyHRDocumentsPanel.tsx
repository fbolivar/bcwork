'use client'

import { trpc } from '@/lib/trpc-client'
import {
  FileText,
  Download,
  AlertCircle,
  FileCheck,
  GraduationCap,
  Mail,
  FolderOpen,
} from 'lucide-react'

type DocType = 'contract' | 'policy' | 'certificate' | 'letter' | 'other'

const DOC_TYPE_MAP: Record<DocType, { label: string; icon: React.ReactNode; color: string }> = {
  contract: { label: 'Contrato', icon: <FileCheck className="h-4 w-4" />, color: 'text-blue-600' },
  policy: { label: 'Política', icon: <FileText className="h-4 w-4" />, color: 'text-purple-600' },
  certificate: {
    label: 'Certificado',
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'text-green-600',
  },
  letter: { label: 'Carta', icon: <Mail className="h-4 w-4" />, color: 'text-orange-600' },
  other: { label: 'Otro', icon: <FolderOpen className="h-4 w-4" />, color: 'text-gray-500' },
}

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false
  const days = (new Date(expiresAt).getTime() - Date.now()) / 86400000
  return days > 0 && days <= 30
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export function MyHRDocumentsPanel() {
  const { data: documents, isLoading } = trpc.employee.getMyHRDocuments.useQuery()

  const personal = (documents ?? []).filter((d) => d.employee_id)
  const company = (documents ?? []).filter((d) => !d.employee_id)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis documentos HR</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Contratos, políticas y certificados de tu empresa
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (documents ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <FileText className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No hay documentos disponibles</p>
          <p className="mt-1 text-xs text-gray-400">Tu empleador publicará documentos aquí</p>
        </div>
      ) : (
        <div className="space-y-6">
          {personal.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Mis documentos
              </p>
              <div className="space-y-2">
                {personal.map((doc) => (
                  <DocRow key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          )}
          {company.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Documentos de la empresa
              </p>
              <div className="space-y-2">
                {company.map((doc) => (
                  <DocRow key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DocRow({
  doc,
}: {
  doc: {
    id: string
    title: string
    doc_type: string
    file_url: string | null
    file_name: string | null
    expires_at: string | null
    created_at: string
  }
}) {
  const typeInfo = DOC_TYPE_MAP[doc.doc_type as DocType] ?? DOC_TYPE_MAP.other
  const expiring = isExpiringSoon(doc.expires_at)
  const expired = isExpired(doc.expires_at)

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${expired ? 'border-red-100 bg-red-50' : expiring ? 'border-yellow-100 bg-yellow-50' : 'border-gray-100 bg-white'}`}
    >
      <div className={typeInfo.color}>{typeInfo.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{doc.title}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          {typeInfo.label}
          {doc.expires_at && (
            <span className={expired ? 'text-red-500' : expiring ? 'text-yellow-600' : ''}>
              {' · '}
              {expired ? 'Vencido' : expiring ? 'Vence pronto' : 'Vence'}{' '}
              {new Date(doc.expires_at + 'T12:00:00').toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </p>
      </div>
      {expired && <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
      {doc.file_url && (
        <a
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          <Download className="h-3.5 w-3.5" />
          Abrir
        </a>
      )}
    </div>
  )
}
