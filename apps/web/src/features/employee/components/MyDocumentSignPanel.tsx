'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  FileCheck,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
} from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  contract: 'Contrato',
  id: 'Identificación',
  certificate: 'Certificado',
  payslip: 'Desprendible',
  letter: 'Carta',
  other: 'Otro',
}

export function MyDocumentSignPanel() {
  const utils = trpc.useUtils()
  const [signModal, setSignModal] = useState<any>(null)
  const [signNote, setSignNote] = useState('')
  const [filterSigned, setFilterSigned] = useState<'all' | 'pending' | 'signed'>('all')

  const { data, isLoading } = trpc.employee.getMyEmployeeDocuments.useQuery()
  const sign = trpc.employee.signEmployeeDocument.useMutation({
    onSuccess: () => {
      utils.employee.getMyEmployeeDocuments.invalidate()
      setSignModal(null)
      setSignNote('')
    },
  })

  const docs = (data ?? []) as any[]
  const pendingSign = docs.filter((d) => d.requires_signature && !d.signed_at)
  const signed = docs.filter((d) => d.requires_signature && d.signed_at)
  const info = docs.filter((d) => !d.requires_signature)

  const filtered =
    filterSigned === 'pending'
      ? docs.filter((d) => d.requires_signature && !d.signed_at)
      : filterSigned === 'signed'
        ? docs.filter((d) => d.requires_signature && d.signed_at)
        : docs

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Mis documentos</h2>
        <p className="mt-0.5 text-sm text-gray-500">Documentos asignados por Recursos Humanos</p>
      </div>

      {/* Pending alert */}
      {pendingSign.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" />
          <p className="text-xs text-yellow-700">
            Tienes <strong>{pendingSign.length}</strong>{' '}
            {pendingSign.length === 1 ? 'documento pendiente' : 'documentos pendientes'} de firma
          </p>
        </div>
      )}

      {/* Summary */}
      {docs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{docs.length}</p>
            <p className="text-[10px] text-gray-400">Total</p>
          </div>
          <div className="rounded-xl border border-yellow-50 bg-yellow-50 p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingSign.length}</p>
            <p className="text-[10px] text-yellow-400">Por firmar</p>
          </div>
          <div className="rounded-xl border border-green-50 bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{signed.length}</p>
            <p className="text-[10px] text-green-500">Firmados</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5">
        {(['all', 'pending', 'signed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilterSigned(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterSigned === f ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {f === 'all' ? 'Todos' : f === 'pending' ? 'Por firmar' : 'Firmados'}
          </button>
        ))}
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
          <p className="text-sm text-gray-500">No hay documentos en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d: any) => {
            const needsSign = d.requires_signature && !d.signed_at
            const isSigned = d.requires_signature && d.signed_at
            return (
              <div
                key={d.id}
                className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 ${needsSign ? 'border-yellow-200' : 'border-gray-100'}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${needsSign ? 'bg-yellow-100' : isSigned ? 'bg-green-100' : 'bg-gray-100'}`}
                >
                  {isSigned ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
                  ) : needsSign ? (
                    <Clock className="h-4.5 w-4.5 text-yellow-600" />
                  ) : (
                    <FileText className="h-4.5 w-4.5 text-gray-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{d.title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                      {CATEGORY_LABELS[d.category] ?? d.category}
                    </span>
                    {isSigned && (
                      <span className="text-[10px] text-green-600">
                        Firmado {new Date(d.signed_at).toLocaleDateString('es-CO')}
                      </span>
                    )}
                    {d.expiry_date && (
                      <span className="text-[10px] text-gray-400">
                        Vence {new Date(d.expiry_date).toLocaleDateString('es-CO')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver documento"
                      className="rounded p-1 text-gray-300 hover:text-blue-500"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {needsSign && (
                    <button
                      type="button"
                      onClick={() => {
                        setSignModal(d)
                        setSignNote('')
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      <FileCheck className="h-3.5 w-3.5" /> Firmar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {signModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Firmar documento</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setSignModal(null)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-800">{signModal.title}</p>
              <p className="text-xs text-gray-400">
                {CATEGORY_LABELS[signModal.category] ?? signModal.category}
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Al firmar confirmas que has leído y aceptas el contenido de este documento. Esta
              acción queda registrada con fecha y hora.
            </p>
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-700">Nota (opcional)</label>
              <textarea
                value={signNote}
                onChange={(e) => setSignNote(e.target.value)}
                rows={2}
                placeholder="Ej: Leído y de acuerdo..."
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setSignModal(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sign.isPending}
                onClick={() =>
                  sign.mutate({ id: signModal.id, signature_note: signNote || undefined })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <FileCheck className="mr-1.5 inline h-3.5 w-3.5" />
                Confirmar firma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
