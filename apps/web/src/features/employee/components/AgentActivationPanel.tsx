'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { MonitorDown, Copy, Check, RefreshCw, Download, Shield, Clock } from 'lucide-react'

function fmtExpiry(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Expirado'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m} minutos`
}

const STEPS = [
  {
    n: '1',
    title: 'Descarga el agente',
    desc: 'Descarga el instalador para tu sistema operativo.',
  },
  {
    n: '2',
    title: 'Instala y abre la aplicación',
    desc: 'Ejecuta el instalador y sigue las instrucciones. Al abrirlo, verás una pantalla de bienvenida.',
  },
  {
    n: '3',
    title: 'Ingresa el código de activación',
    desc: 'Copia el código de arriba y pégalo en el campo "Código de activación" del agente.',
  },
  {
    n: '4',
    title: '¡Listo!',
    desc: 'El agente quedará asociado a tu cuenta. Aparecerá en "Mis dispositivos" en minutos.',
  },
]

export function AgentActivationPanel() {
  const utils = trpc.useUtils()
  const { data: devices } = trpc.employee.getMyDevices.useQuery()
  const [codeData, setCodeData] = useState<{ code: string; expiresAt: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = trpc.employee.getOrCreateEnrollmentCode.useMutation({
    onSuccess: (data) => setCodeData(data),
  })

  function copyCode() {
    if (!codeData?.code) return
    void navigator.clipboard.writeText(codeData.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeDevices = (devices ?? []).filter((d) => !d.revoked_at)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Activar agente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Instala BCWork Agent en tu computador para registrar tu actividad de trabajo
        </p>
      </div>

      {/* Estado de dispositivos */}
      {activeDevices.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-700">
            <span className="font-medium">Agente activo</span> en {activeDevices.length} dispositivo
            {activeDevices.length > 1 ? 's' : ''}. Puedes agregar otro dispositivo con un nuevo
            código.
          </p>
        </div>
      )}

      {/* Código de activación */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-blue-900">Código de activación</h2>
        </div>

        {codeData ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-xl border-2 border-blue-300 bg-white px-6 py-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-blue-700">
                {codeData.code}
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
              <Clock className="h-3.5 w-3.5" />
              Válido por {fmtExpiry(codeData.expiresAt)} · Uso único
            </div>
            <button
              type="button"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generate.isPending ? 'animate-spin' : ''}`} />
              Generar nuevo código
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <MonitorDown className="mb-3 h-10 w-10 text-blue-400" />
            <p className="mb-4 text-center text-sm text-blue-700">
              Genera un código único para vincular el agente a tu cuenta
            </p>
            <button
              type="button"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {generate.isPending ? 'Generando...' : 'Generar código de activación'}
            </button>
            {generate.error && (
              <p className="mt-2 text-sm text-red-600">{generate.error.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Descarga */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Descargar agente</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Windows', icon: '🪟', note: '.exe • Windows 10/11' },
            { label: 'macOS', icon: '🍎', note: '.dmg • macOS 12+' },
          ].map((p) => (
            <div
              key={p.label}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 opacity-60"
            >
              <span className="text-2xl">{p.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">BCWork Agent — {p.label}</p>
                <p className="text-xs text-gray-400">{p.note}</p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                Próximamente
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          ¿Tu empresa usa distribución centralizada? Pide a tu administrador el instalador MSI/PKG.
        </p>
      </div>

      {/* Pasos de instalación */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Cómo activar el agente</h2>
        <div className="space-y-4">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {step.n}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
