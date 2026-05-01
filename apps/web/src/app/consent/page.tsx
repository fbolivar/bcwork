'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Shield, CheckCircle2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function ConsentPage() {
  const router = useRouter()
  const [accepted, setAccepted] = useState(false)
  const [done, setDone] = useState(false)

  const grant = trpc.employee.grantConsent.useMutation({
    onSuccess: () => {
      setDone(true)
      setTimeout(() => router.push('/me/dashboard'), 1200)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accepted) return
    grant.mutate({ userAgent: navigator.userAgent })
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="text-lg font-semibold text-gray-800">Consentimiento registrado</p>
          <p className="text-sm text-gray-500">Redirigiendo al panel…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Encabezado */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Autorización de monitoreo</h1>
            <p className="text-xs text-gray-500">BCWork · Aviso de privacidad v1.0</p>
          </div>
        </div>

        {/* Cuerpo del aviso resumido */}
        <div className="mb-6 space-y-4 rounded-xl bg-gray-50 p-5 text-sm leading-relaxed text-gray-700">
          <p>
            De conformidad con la <strong>Ley 1581 de 2012 (HABEAS DATA)</strong>, la{' '}
            <strong>Ley 2121 de 2021 (Trabajo Remoto)</strong> y la{' '}
            <strong>Ley 2191 de 2022 (Desconexión Digital)</strong>, tu empleador recopila y procesa
            los siguientes datos durante tu jornada laboral:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-gray-600">
            <li>Tiempo de actividad en aplicaciones y sitios web (sin capturas de pantalla)</li>
            <li>Clasificación de productividad de aplicaciones usadas</li>
            <li>Información del dispositivo de trabajo (nombre, plataforma, hostname)</li>
            <li>Duración y estado de sesiones de trabajo</li>
            <li>Dirección IP y ubicación de red (remoto / oficina)</li>
          </ul>
          <p>
            Estos datos se usan <strong>únicamente</strong> para gestión del desempeño, nómina y
            cumplimiento legal. <strong>No se graba audio, video ni capturas de pantalla.</strong>
          </p>
          <p>
            El monitoreo opera <strong>solo dentro de tu jornada laboral</strong> configurada. Fuera
            de ella no se recopila ningún dato (Ley 2191/2022).
          </p>
          <p>
            Tienes derecho a conocer, actualizar, rectificar y suprimir tus datos personales, así
            como a revocar este consentimiento en cualquier momento contactando a tu administrador.
          </p>
          <Link
            href="/legal/privacidad"
            target="_blank"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            Leer aviso de privacidad completo
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              He leído y acepto el aviso de privacidad. Autorizo el procesamiento de mis datos
              personales en los términos descritos, conforme a la Ley 1581 de 2012.
            </span>
          </label>

          <button
            type="submit"
            disabled={!accepted || grant.isPending}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            {grant.isPending ? 'Registrando…' : 'Continuar al panel'}
          </button>

          {grant.error && (
            <p className="text-center text-xs text-red-500">
              Error al registrar el consentimiento. Intenta de nuevo.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
