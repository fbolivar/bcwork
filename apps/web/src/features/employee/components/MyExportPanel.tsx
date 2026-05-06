'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/server/routers'
import { Download, FileJson, FileText, Loader2, CheckCircle } from 'lucide-react'

type RouterOutputs = inferRouterOutputs<AppRouter>
type ExportData = RouterOutputs['employee']['getMyExportData']

function fmtSecs(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toCSV(data: ExportData): string {
  const lines: string[] = []

  lines.push('=== PERFIL ===')
  if (data.profile) {
    lines.push('Nombre,Email,Rol,Departamento,Cargo,Miembro desde,Último acceso')
    lines.push(
      [
        data.profile.full_name ?? '',
        data.profile.email,
        data.profile.role,
        data.profile.department ?? '',
        data.profile.position ?? '',
        data.profile.created_at ?? '',
        data.profile.last_login_at ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
  }
  lines.push('')

  lines.push('=== MÉTRICAS DIARIAS (últimos 90 días) ===')
  lines.push(
    'Fecha,Horas activas,Horas productivas,Horas no productivas,Horas extras,% Productividad',
  )
  for (const m of data.daily_metrics) {
    lines.push(
      [
        m.metric_date,
        fmtSecs(m.active_seconds ?? 0),
        fmtSecs(m.productive_seconds ?? 0),
        fmtSecs(m.non_productive_seconds ?? 0),
        fmtSecs(m.overtime_seconds ?? 0),
        `${Math.round(Number(m.productivity_ratio ?? 0) * 100)}%`,
      ]
        .map((v) => `"${v}"`)
        .join(','),
    )
  }
  lines.push('')

  lines.push('=== SESIONES DE TRABAJO (últimos 90 días) ===')
  lines.push('Inicio,Fin,Tiempo activo,Tiempo inactivo')
  for (const s of data.sessions) {
    lines.push(
      [
        s.started_at,
        s.ended_at ?? 'Activa',
        fmtSecs(s.active_seconds ?? 0),
        fmtSecs(s.idle_seconds ?? 0),
      ]
        .map((v) => `"${v}"`)
        .join(','),
    )
  }
  lines.push('')

  lines.push('=== AUSENCIAS ===')
  lines.push('Tipo,Desde,Hasta,Estado,Notas')
  for (const t of data.time_off) {
    lines.push(
      [t.type, t.starts_on, t.ends_on, t.status ?? '', t.notes ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
  }
  lines.push('')

  lines.push('=== CONSENTIMIENTOS ===')
  lines.push('Tipo,Otorgado,Fecha,Revocado')
  for (const c of data.consents) {
    lines.push(
      [c.consent_type, c.granted ? 'Sí' : 'No', c.granted_at ?? '', c.revoked_at ?? 'Vigente']
        .map((v) => `"${v}"`)
        .join(','),
    )
  }

  return lines.join('\n')
}

export function MyExportPanel() {
  const [downloaded, setDownloaded] = useState<'json' | 'csv' | null>(null)

  const { data, isLoading, refetch } = trpc.employee.getMyExportData.useQuery(undefined, {
    enabled: false,
    refetchOnWindowFocus: false,
  })

  async function handleExport(format: 'json' | 'csv') {
    const result = await refetch()
    if (!result.data) return

    const filename = `bcwork-mis-datos-${new Date().toISOString().slice(0, 10)}`

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      })
      downloadBlob(blob, `${filename}.json`)
    } else {
      const blob = new Blob(['﻿' + toCSV(result.data)], {
        type: 'text/csv;charset=utf-8',
      })
      downloadBlob(blob, `${filename}.csv`)
    }

    setDownloaded(format)
    setTimeout(() => setDownloaded(null), 3000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Exportar mis datos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Descarga toda la información que BCWork tiene sobre ti. Derecho reconocido por la Ley 1581
          de 2012 (habeas data).
        </p>
      </div>

      {/* Qué incluye */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">
          Datos incluidos en la exportación
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ['Perfil', 'Nombre, email, rol, departamento, cargo'],
            ['Métricas diarias', 'Productividad, horas activas y extras (90 días)'],
            ['Sesiones de trabajo', 'Entradas y salidas registradas (90 días)'],
            ['Solicitudes de corrección', 'Historial de correcciones solicitadas'],
            ['Ausencias', 'Todas tus solicitudes de vacaciones y licencias'],
            ['Consentimientos', 'Historial de consentimientos otorgados y revocados'],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-2.5">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">{title}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botones de descarga */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleExport('csv')}
          disabled={isLoading}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-blue-300 hover:shadow-sm disabled:opacity-60"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
            {isLoading && downloaded === null ? (
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
            ) : downloaded === 'csv' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <FileText className="h-5 w-5 text-green-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">Descargar CSV</p>
            <p className="text-xs text-gray-500">Compatible con Excel, Google Sheets</p>
          </div>
          <Download className="ml-auto h-4 w-4 text-gray-400" />
        </button>

        <button
          type="button"
          onClick={() => handleExport('json')}
          disabled={isLoading}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-blue-300 hover:shadow-sm disabled:opacity-60"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            {isLoading && downloaded === null ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            ) : downloaded === 'json' ? (
              <CheckCircle className="h-5 w-5 text-blue-600" />
            ) : (
              <FileJson className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">Descargar JSON</p>
            <p className="text-xs text-gray-500">Formato completo, apto para portabilidad</p>
          </div>
          <Download className="ml-auto h-4 w-4 text-gray-400" />
        </button>
      </div>

      {data && (
        <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-xs text-green-700">
          Datos generados el {new Date(data.exported_at).toLocaleString('es-CO')} —{' '}
          {data.sessions.length} sesiones · {data.daily_metrics.length} días de métricas ·{' '}
          {data.time_off.length} ausencias
        </div>
      )}

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">
        Esta exportación incluye datos de los últimos 90 días. Para información adicional o
        solicitudes de eliminación, contacta al administrador de tu organización.
      </div>
    </div>
  )
}
