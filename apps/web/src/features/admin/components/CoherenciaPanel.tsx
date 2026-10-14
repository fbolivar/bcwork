'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, RefreshCw } from 'lucide-react'

/**
 * Auto-verificación de coherencia: la app se revisa a sí misma y avisa si un
 * número no cuadra, antes de que lo vea el administrador o el cliente.
 */

type Estado = 'ok' | 'alerta' | 'falla'

const ESTILO: Record<
  Estado,
  { icon: typeof CheckCircle2; color: string; bg: string; texto: string }
> = {
  ok: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    texto: 'Correcto',
  },
  alerta: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    texto: 'Atención',
  },
  falla: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', texto: 'Falla' },
}

const VENTANAS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
]

export function CoherenciaPanel() {
  const [days, setDays] = useState(7)
  const { data, isLoading, isFetching, refetch } = trpc.admin.getCoherencia.useQuery(
    { days },
    { refetchOnWindowFocus: false },
  )

  const general = data?.estadoGeneral ?? 'ok'
  const Est = ESTILO[general]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            Coherencia
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            La plataforma se revisa a sí misma: valida que los números que muestra sean internamente
            consistentes. No evalúa personas, evalúa los datos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            {VENTANAS.map((v) => (
              <button
                key={v.days}
                type="button"
                onClick={() => setDays(v.days)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  days === v.days ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Verificar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          Verificando coherencia…
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          No se pudo ejecutar la verificación.
        </div>
      ) : (
        <>
          <div className={`mb-5 flex items-center gap-4 rounded-xl border p-5 ${Est.bg}`}>
            <Est.icon className={`h-10 w-10 shrink-0 ${Est.color}`} />
            <div>
              <p className={`text-lg font-semibold ${Est.color}`}>
                {general === 'ok'
                  ? 'Todo coherente'
                  : general === 'alerta'
                    ? 'Revisar algunas alertas'
                    : 'Hay fallas de coherencia'}
              </p>
              <p className="text-sm text-gray-600">
                {data.checks.filter((c) => c.estado === 'ok').length} de {data.checks.length}{' '}
                verificaciones en verde · {data.people} personas · {data.dayRows} jornadas ·{' '}
                {data.rangeLabel}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {data.checks.map((c) => {
              const e = ESTILO[c.estado as Estado]
              return (
                <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <e.icon className={`mt-0.5 h-5 w-5 shrink-0 ${e.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{c.titulo}</h3>
                        <span className={`text-xs font-medium ${e.color}`}>{e.texto}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">{c.descripcion}</p>
                      <p className="mt-2 text-sm text-gray-700">{c.resumen}</p>
                      {c.muestras.length > 0 && (
                        <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                          {c.muestras.map((m, i) => (
                            <li key={i} className="flex flex-wrap gap-x-2 text-xs">
                              <span className="font-medium text-gray-700">{m.etiqueta}</span>
                              <span className="text-gray-500">{m.detalle}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-5 text-center text-xs text-gray-400">
            Verificado {new Date(data.generatedAt).toLocaleString('es-CO')}
          </p>
        </>
      )}
    </div>
  )
}
