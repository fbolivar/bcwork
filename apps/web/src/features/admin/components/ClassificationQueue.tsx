'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { ListChecks, Monitor, Globe } from 'lucide-react'

/**
 * Cola de clasificación: las aplicaciones y sitios donde el equipo pasa más
 * tiempo, con su clasificación actual y botones para ajustarla en un clic. Es
 * lo que evita que "Comercial" salga con baja productividad solo porque su
 * herramienta (WhatsApp Web, portales) está marcada como neutral.
 */

type Fila = {
  kind: 'app' | 'site'
  identifier: string
  seconds: number
  productivity: string
  rule_id: string | null
  rule_category: string | null
  rule_productivity: string | null
}

const OPCIONES: { val: 'productive' | 'neutral' | 'non_productive'; label: string; cls: string }[] =
  [
    { val: 'productive', label: 'Productiva', cls: 'bg-green-600 text-white' },
    { val: 'neutral', label: 'Neutral', cls: 'bg-gray-400 text-white' },
    { val: 'non_productive', label: 'Improductiva', cls: 'bg-orange-500 text-white' },
  ]

function horas(s: number) {
  return `${Math.round((s / 3600) * 10) / 10} h`
}

export function ClassificationQueue() {
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.admin.listUsageToClassify.useQuery()
  const [guardando, setGuardando] = useState<string | null>(null)

  const upsert = trpc.admin.upsertAppRule.useMutation({
    onSuccess: () => {
      void utils.admin.listUsageToClassify.invalidate()
      void utils.admin.listAppRules.invalidate()
      setGuardando(null)
    },
    onError: () => setGuardando(null),
  })

  function clasificar(f: Fila, prod: 'productive' | 'neutral' | 'non_productive') {
    setGuardando(f.identifier + prod)
    upsert.mutate({
      id: f.rule_id ?? undefined,
      display_name: f.identifier,
      identifier: f.identifier,
      identifier_type: f.kind === 'site' ? 'domain' : 'process',
      category:
        (f.rule_category as
          | 'communication'
          | 'development'
          | 'browsing'
          | 'entertainment'
          | 'productivity'
          | 'other'
          | null) ?? (f.kind === 'site' ? 'browsing' : 'other'),
      productivity: prod,
    })
  }

  const filas = (data ?? []) as Fila[]
  const apps = filas.filter((f) => f.kind === 'app')
  const sites = filas.filter((f) => f.kind === 'site')

  const Tabla = ({
    items,
    icon: Icon,
    titulo,
  }: {
    items: Fila[]
    icon: typeof Monitor
    titulo: string
  }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map((f) => {
          const actual = f.rule_productivity ?? f.productivity
          return (
            <li key={f.identifier} className="flex items-center gap-3 py-2">
              <span className="w-48 shrink-0 truncate text-sm text-gray-800" title={f.identifier}>
                {f.identifier}
              </span>
              <span className="w-14 shrink-0 text-right text-xs tabular-nums text-gray-500">
                {horas(f.seconds)}
              </span>
              <span className="ml-auto flex gap-1">
                {OPCIONES.map((o) => {
                  const activo = actual === o.val
                  const cargando = guardando === f.identifier + o.val
                  return (
                    <button
                      key={o.val}
                      type="button"
                      disabled={upsert.isPending}
                      onClick={() => clasificar(f, o.val)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                        activo ? o.cls : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {cargando ? '…' : o.label}
                    </button>
                  )
                })}
              </span>
              {!f.rule_id && (
                <span
                  className="w-16 shrink-0 text-[10px] text-gray-300"
                  title="Sin regla propia; usa la clasificación por defecto"
                >
                  por defecto
                </span>
              )}
              {f.rule_id && <span className="w-16 shrink-0" />}
            </li>
          )
        })}
        {items.length === 0 && <li className="py-3 text-sm text-gray-400">Sin datos.</li>}
      </ul>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Clasificar por uso real</h2>
        </div>
        <p className="mt-1 text-xs text-gray-600">
          Lo que más se usó en los últimos 30 días. Marca cada uno como productivo, neutral o
          improductivo; el cambio se aplica de inmediato a los informes futuros.
        </p>
      </div>
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Tabla items={apps} icon={Monitor} titulo="Aplicaciones" />
          <Tabla items={sites} icon={Globe} titulo="Sitios web" />
        </div>
      )}
    </div>
  )
}
