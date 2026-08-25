'use client'

import { useState } from 'react'
import { Download, ShieldCheck, Loader2 } from 'lucide-react'

// Tarjeta "Instalador del tenant": descarga el MSI firmado, pre-compilado para
// esta empresa (token horneado). El PC se auto-enrola y la persona se elige una
// sola vez. Sin códigos.
export function TenantInstallerCard() {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setDownloading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/installer')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.message ?? j.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'BCWork-Agent.msi'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <h2 className="text-base font-semibold text-gray-900">Instalador del tenant</h2>
          </div>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Un solo instalador firmado para toda tu empresa. Se instala como servicio de Windows (el
            empleado no puede apagarlo ni desinstalarlo sin permisos de administrador) y cada PC se
            auto-enrola sin códigos. La persona solo elige su nombre una vez.
          </p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloading ? 'Descargando…' : 'Descargar instalador (.msi)'}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
        Firmado por <strong>BC Security SAS</strong>. Para que Windows lo reconozca sin avisos,
        confía el certificado en los PC (una sola vez por GPO). Recomendado: desplegar por
        GPO/Intune, donde se instala en silencio.
      </div>
    </div>
  )
}
