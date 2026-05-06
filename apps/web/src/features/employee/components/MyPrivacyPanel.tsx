'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { ShieldCheck, Eye, Clock, Cpu, Globe, AlertTriangle, CheckCircle2 } from 'lucide-react'

const DATA_COLLECTED = [
  {
    icon: Clock,
    title: 'Tiempo de trabajo',
    desc: 'Horas de inicio y fin de sesión, tiempo activo e inactivo durante tu jornada laboral.',
  },
  {
    icon: Cpu,
    title: 'Aplicaciones utilizadas',
    desc: 'Nombre de las aplicaciones de escritorio que usas y el tiempo dedicado a cada una.',
  },
  {
    icon: Globe,
    title: 'Sitios web visitados',
    desc: 'Dominios de las páginas web que visitas desde tu dispositivo de trabajo (sin contenido ni URLs completas).',
  },
  {
    icon: Eye,
    title: 'Métricas de productividad',
    desc: 'Clasificación automática de aplicaciones como productivas, no productivas o neutras, según la configuración de tu empresa.',
  },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MyPrivacyPanel() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const { data: consent, isLoading } = trpc.employee.getMyConsentDetails.useQuery()
  const [confirming, setConfirming] = useState(false)
  const [revoked, setRevoked] = useState(false)

  const revokeConsent = trpc.employee.revokeConsent.useMutation({
    onSuccess: () => {
      void utils.employee.getMyConsentDetails.invalidate()
      void utils.employee.hasConsented.invalidate()
      setConfirming(false)
      setRevoked(true)
      setTimeout(() => router.push('/consent'), 3000)
    },
  })

  const isActive = consent?.granted && !consent.revoked_at

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mi privacidad</h1>
        <p className="mt-1 text-sm text-gray-500">
          Qué datos recopila BCWork y cómo ejercer tus derechos (Ley 1581/2012)
        </p>
      </div>

      {/* Qué datos se recopilan */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Datos que se recopilan</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {DATA_COLLECTED.map((item) => (
            <div key={item.title} className="flex gap-3 rounded-xl bg-gray-50 p-4">
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Los datos son de uso exclusivo de tu empleador para gestión del teletrabajo. No se venden
          ni comparten con terceros. Bases legales: Ley 2121/2021 (teletrabajo) y Ley 1581/2012
          (habeas data).
        </p>
      </div>

      {/* Estado del consentimiento */}
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        <div
          className={`rounded-2xl border p-6 ${isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {isActive ? 'Consentimiento activo' : 'Consentimiento revocado'}
              </p>
              {consent?.granted_at && (
                <p className="mt-1 text-xs text-gray-500">
                  Otorgado el {fmtDate(consent.granted_at)}
                </p>
              )}
              {consent?.revoked_at && (
                <p className="mt-1 text-xs text-red-600">
                  Revocado el {fmtDate(consent.revoked_at)}
                </p>
              )}
              {consent?.policy_version && (
                <p className="mt-0.5 text-xs text-gray-400">
                  Versión de política: {consent.policy_version}
                </p>
              )}
            </div>
            {isActive && (
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                Activo
              </span>
            )}
          </div>

          {revoked && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Consentimiento revocado. Redirigiendo...
            </div>
          )}

          {isActive && !revoked && (
            <div className="mt-4 border-t border-green-200 pt-4">
              {!confirming ? (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Revocar consentimiento
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <div className="text-sm text-red-700">
                      <p className="font-medium">¿Seguro que quieres revocar?</p>
                      <p className="mt-1 text-xs">
                        Al revocar el consentimiento, el agente de monitoreo dejará de recopilar
                        datos. Es posible que esto afecte tu cumplimiento laboral según el contrato
                        de teletrabajo. Esta acción quedará registrada.
                      </p>
                    </div>
                  </div>
                  {revokeConsent.error && (
                    <p className="text-sm text-red-600">{revokeConsent.error.message}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeConsent.mutate()}
                      disabled={revokeConsent.isPending}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {revokeConsent.isPending ? 'Revocando...' : 'Confirmar revocación'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
