'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  FileText,
  Download,
  AlertCircle,
  FileCheck,
  GraduationCap,
  Mail,
  FolderOpen,
  PenLine,
  CheckCircle2,
  X,
  Trash2,
  RotateCcw,
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

type Doc = {
  id: string
  title: string
  doc_type: string
  file_url: string | null
  file_name: string | null
  expires_at: string | null
  created_at: string
  employee_id: string | null
  requires_signature: boolean
  signed_at: string | null
  signature_data: string | null
  signed_name: string | null
}

export function MyHRDocumentsPanel() {
  const [signingDoc, setSigningDoc] = useState<Doc | null>(null)
  const { data: documents, isLoading } = trpc.employee.getMyHRDocuments.useQuery()

  const pending = (documents ?? []).filter(
    (d) => d.requires_signature && !d.signed_at && d.employee_id,
  ) as Doc[]
  const personal = (documents ?? []).filter((d) => d.employee_id) as Doc[]
  const company = (documents ?? []).filter((d) => !d.employee_id) as Doc[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis documentos HR</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Contratos, políticas y certificados de tu empresa
        </p>
      </div>

      {!isLoading && pending.length > 0 && (
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
          <p className="text-sm font-semibold text-orange-800">
            {pending.length} documento{pending.length > 1 ? 's' : ''} pendiente
            {pending.length > 1 ? 's' : ''} de firma
          </p>
          <div className="mt-2 space-y-1.5">
            {pending.map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <span className="text-xs text-orange-700">{d.title}</span>
                <button
                  type="button"
                  onClick={() => setSigningDoc(d)}
                  className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1 text-xs font-medium text-white hover:bg-orange-700"
                >
                  <PenLine className="h-3 w-3" />
                  Firmar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <DocRow key={doc.id} doc={doc} onSign={() => setSigningDoc(doc)} />
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
                  <DocRow key={doc.id} doc={doc} onSign={() => setSigningDoc(doc)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {signingDoc && <SignatureModal doc={signingDoc} onClose={() => setSigningDoc(null)} />}
    </div>
  )
}

function DocRow({ doc, onSign }: { doc: Doc; onSign: () => void }) {
  const typeInfo = DOC_TYPE_MAP[doc.doc_type as DocType] ?? DOC_TYPE_MAP.other
  const expiring = isExpiringSoon(doc.expires_at)
  const expired = isExpired(doc.expires_at)
  const needsSign = doc.requires_signature && !doc.signed_at && doc.employee_id
  const isSigned = doc.requires_signature && !!doc.signed_at

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        expired
          ? 'border-red-100 bg-red-50'
          : needsSign
            ? 'border-orange-100 bg-orange-50'
            : expiring
              ? 'border-yellow-100 bg-yellow-50'
              : 'border-gray-100 bg-white'
      }`}
    >
      <div className={typeInfo.color}>{typeInfo.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{doc.title}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          {typeInfo.label}
          {isSigned && (
            <span className="text-green-600">
              {' '}
              · Firmado{' '}
              {new Date(doc.signed_at!).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
          {needsSign && <span className="text-orange-600"> · Requiere tu firma</span>}
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
      {isSigned && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
      {needsSign && (
        <button
          type="button"
          onClick={onSign}
          className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
        >
          <PenLine className="h-3 w-3" />
          Firmar
        </button>
      )}
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

function SignatureModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const utils = trpc.useUtils()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [signedName, setSignedName] = useState('')
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })

  const sign = trpc.employee.signDocument.useMutation({
    onSuccess: () => {
      utils.employee.getMyHRDocuments.invalidate()
      onClose()
    },
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e40af'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    const me = e as React.MouseEvent
    return {
      x: (me.clientX - rect.left) * scaleX,
      y: (me.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    const pos = getPos(e, canvas)
    setIsDrawing(true)
    setLastPos(pos)
  }, [])

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return
      const canvas = canvasRef.current
      if (!canvas) return
      e.preventDefault()
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const pos = getPos(e, canvas)
      ctx.beginPath()
      ctx.moveTo(lastPos.x, lastPos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      setLastPos(pos)
      setHasSignature(true)
    },
    [isDrawing, lastPos],
  )

  const stopDraw = useCallback(() => setIsDrawing(false), [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleSubmit = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature || !signedName.trim()) return
    const dataUrl = canvas.toDataURL('image/png')
    sign.mutate({ id: doc.id, signature_data: dataUrl, signed_name: signedName.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Firma electrónica</h3>
            <p className="mt-0.5 text-xs text-gray-500">{doc.title}</p>
          </div>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="signed-name" className="text-xs font-medium text-gray-700">
              Nombre completo (confirma tu identidad)
            </label>
            <input
              id="signed-name"
              type="text"
              placeholder="Escribe tu nombre completo"
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                Firma (dibuja con el mouse o dedo)
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <RotateCcw className="h-3 w-3" />
                Limpiar
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={480}
              height={180}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
              className="h-36 w-full cursor-crosshair touch-none rounded-xl border-2 border-dashed border-gray-300 bg-gray-50"
            />
            {!hasSignature && (
              <p className="mt-1 text-center text-xs text-gray-400">Dibuja tu firma aquí</p>
            )}
          </div>

          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Al firmar confirmas que has leído y aceptado el documento "<strong>{doc.title}</strong>"
            con fecha{' '}
            {new Date().toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
            .
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!hasSignature || !signedName.trim() || sign.isPending}
            onClick={handleSubmit}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <PenLine className="h-4 w-4" />
            Firmar documento
          </button>
        </div>
      </div>
    </div>
  )
}
