'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[MainError]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl border border-red-100 bg-white px-10 py-12 shadow-sm">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-red-400" />
        <h1 className="text-xl font-semibold text-gray-900">Algo salió mal</h1>
        <p className="mt-2 text-sm text-gray-500">
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>
        {error.digest && <p className="mt-1 text-xs text-gray-400">Referencia: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Intentar de nuevo
          </button>
          <Link
            href="/me/dashboard"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
