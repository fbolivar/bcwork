'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { FileCheck, Plus, X, Clock, CheckCircle2, Package } from 'lucide-react'

type CertType = 'income' | 'experience' | 'paz_y_salvo' | 'employment' | 'other'

const TYPE_LABELS: Record<CertType, string> = {
  income: 'Certificado de ingresos',
  experience: 'Certificado de experiencia laboral',
  paz_y_salvo: 'Paz y salvo',
  employment: 'Constancia de empleo',
  other: 'Otro',
}

const STATUS_MAP = {
  pending: { label: 'En proceso', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ready: { label: 'Listo para recoger', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  delivered: { label: 'Entregado', color: 'bg-gray-100 text-gray-500', icon: Package },
}

export function CertificatesPanel() {
  const utils = trpc.useUtils()
  const [showRequest, setShowRequest] = useState(false)
  const [type, setType] = useState<CertType>('income')
  const [reason, setReason] = useState('')

  const { data: certs, isLoading } = trpc.employee.getMyCertificates.useQuery()

  const request = trpc.employee.requestCertificate.useMutation({
    onSuccess: () => {
      utils.employee.getMyCertificates.invalidate()
      setShowRequest(false)
      setType('income')
      setReason('')
    },
  })

  const allCerts = (certs ?? []) as any[]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Certificados laborales</h1>
          <p className="mt-0.5 text-sm text-gray-500">Solicita documentos de tu relación laboral</p>
        </div>
        <button
          type="button"
          onClick={() => setShowRequest(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Solicitar certificado
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allCerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <FileCheck className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No tienes solicitudes de certificados</p>
          <p className="mt-1 text-xs text-gray-400">
            Tus solicitudes aparecerán aquí una vez las realices
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allCerts.map((c: any) => {
            const st = STATUS_MAP[c.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.pending
            const StatusIcon = st.icon
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <FileCheck className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {TYPE_LABELS[c.type as CertType] ?? c.type}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Solicitado{' '}
                    {new Date(c.created_at).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {c.notes && ` · ${c.notes}`}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {st.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {showRequest && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Solicitar certificado</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowRequest(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="cert-type" className="text-xs font-medium text-gray-700">
                  Tipo de certificado
                </label>
                <select
                  id="cert-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as CertType)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cert-reason" className="text-xs font-medium text-gray-700">
                  Motivo (opcional)
                </label>
                <textarea
                  id="cert-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Solicitud de crédito bancario"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowRequest(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={request.isPending}
                onClick={() => request.mutate({ type, reason: reason || undefined })}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Enviar solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
