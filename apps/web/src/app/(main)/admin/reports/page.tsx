'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ReportsOverview } from '@/features/admin/components/ReportsOverview'
import { ReportsCompareMembers } from '@/features/admin/components/ReportsCompareMembers'

/**
 * Informes: Resumen y Comparar por miembros viven aquí; Horas extra, Proyectos
 * y el Constructor ya tienen su módulo y la pestaña lleva allá. Lo que no
 * existe se dice, no se disimula.
 */
const PESTANAS = [
  { v: 'resumen', l: 'Resumen' },
  { v: 'miembros', l: 'Comparar por miembros' },
  { v: 'fecha', l: 'Comparar por fecha' },
  { v: 'overtime', l: 'Horas extra', href: '/admin/overtime' },
  { v: 'proyectos-vision', l: 'Visión general de proyectos' },
  { v: 'proyectos', l: 'Proyectos', href: '/admin/projects' },
  { v: 'constructor', l: 'Constructor de informes', href: '/admin/report-builder' },
] as const

type Pestana = (typeof PESTANAS)[number]['v']

export default function ReportsPage() {
  const [pestana, setPestana] = useState<Pestana>('resumen')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Informes</h1>

      <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
        {PESTANAS.map((p) =>
          'href' in p ? (
            <Link
              key={p.v}
              href={p.href}
              className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800"
            >
              {p.l}
            </Link>
          ) : (
            <button
              key={p.v}
              type="button"
              onClick={() => setPestana(p.v)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                pestana === p.v
                  ? 'bg-white font-medium text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {p.l}
            </button>
          ),
        )}
      </div>

      {pestana === 'resumen' && <ReportsOverview />}
      {pestana === 'miembros' && <ReportsCompareMembers />}
      {(pestana === 'fecha' || pestana === 'proyectos-vision') && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center">
          <p className="text-sm font-medium text-gray-700">
            {pestana === 'fecha' ? 'Comparar por fecha' : 'Visión general de proyectos'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Esta vista todavía no está construida. Mientras tanto, el Constructor de informes
            permite comparar períodos y exportar a Excel.
          </p>
        </div>
      )}
    </div>
  )
}
