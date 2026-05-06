'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Camera, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function offsetDate(base: string, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function MyScreenshotsPanel() {
  const [date, setDate] = useState(today())
  const [lightbox, setLightbox] = useState<string | null>(null)

  const { data, isLoading } = trpc.employee.getMyScreenshots.useQuery(
    { date, limit: 50, offset: 0 },
    { refetchOnWindowFocus: false },
  )

  const screenshots = data?.screenshots ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mis capturas de pantalla</h1>
        <p className="mt-1 text-sm text-gray-500">
          Registros visuales de tu actividad laboral. Solo tú y los administradores de tu
          organización tienen acceso.
        </p>
      </div>

      {/* Navegación por fecha */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setDate((d) => offsetDate(d, -1))}
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setDate((d) => offsetDate(d, 1))}
          disabled={date >= today()}
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
        {data && (
          <span className="text-sm text-gray-500">
            {data.total} capturas el {formatDate(date)}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center text-gray-400">Cargando...</div>
      )}

      {!isLoading && screenshots.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <Camera className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No hay capturas para este día</p>
          <p className="mt-1 text-xs text-gray-400">
            Las capturas se generan automáticamente cuando el agente está activo
          </p>
        </div>
      )}

      {screenshots.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {screenshots.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => s.url && setLightbox(s.url)}
              className="group relative aspect-video overflow-hidden rounded-lg border border-gray-200 bg-gray-100 hover:border-blue-400 hover:shadow-md"
            >
              {s.url ? (
                <img
                  src={s.url}
                  alt={`Captura ${formatTime(s.taken_at)}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Camera className="h-6 w-6 text-gray-300" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <ZoomIn className="h-5 w-5 text-white opacity-0 drop-shadow group-hover:opacity-100" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-2 py-1">
                <p className="text-[10px] text-white">{formatTime(s.taken_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            title="Cerrar"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Captura ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
        <strong>Tu privacidad:</strong> Solo tienes acceso a tus propias capturas. Los
        administradores también pueden verlas de acuerdo al consentimiento que otorgaste. Puedes
        revocar el consentimiento en{' '}
        <a href="/me/privacy" className="underline">
          Mi privacidad
        </a>
        .
      </div>
    </div>
  )
}
