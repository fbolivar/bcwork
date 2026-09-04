'use client'

import { AlertTriangle } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

// Aviso: hay agentes capturando actividad de personas que no dieron su
// consentimiento (Ley 1581/2012). No bloquea nada — lo hace visible para que el
// administrador lo regularice.
export function ConsentWarningCard() {
  const { data = [], isLoading } = trpc.admin.getMonitoringWithoutConsent.useQuery(undefined, {
    staleTime: 60_000,
  })

  if (isLoading || data.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-amber-900">
            {data.length === 1
              ? '1 colaborador monitoreado sin consentimiento'
              : `${data.length} colaboradores monitoreados sin consentimiento`}
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Estos equipos están enviando actividad, pero la persona no ha aceptado la política de
            tratamiento de datos. La Ley 1581 de 2012 exige autorización previa del titular.
          </p>

          <ul className="mt-3 space-y-1.5">
            {data.map((d) => (
              <li
                key={`${d.userId}-${d.hostname}`}
                className="flex flex-wrap items-baseline gap-x-2 text-sm"
              >
                <span className="font-medium text-amber-900">{d.fullName}</span>
                <span className="text-amber-700">{d.email}</span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-amber-800">
                  {d.hostname}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-amber-700">
            Se regulariza cuando la persona inicia sesión en BCWork y acepta la política. Hasta
            entonces la captura continúa: este aviso no la detiene.
          </p>
        </div>
      </div>
    </div>
  )
}
