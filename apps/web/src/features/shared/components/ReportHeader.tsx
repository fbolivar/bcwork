'use client'

import { formatDate } from '@/lib/format'

interface ReportHeaderProps {
  logoUrl?: string | null
  companyName: string
  nit?: string | null
  title: string
  period?: string
  generatedAt?: Date
}

export function ReportHeader({
  logoUrl,
  companyName,
  nit,
  title,
  period,
  generatedAt = new Date(),
}: ReportHeaderProps) {
  return (
    <div className="mb-6 border-b border-gray-200 pb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`Logo ${companyName}`}
              className="h-12 w-auto max-w-[120px] object-contain"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-base font-bold text-gray-900">{companyName}</p>
            {nit && <p className="text-xs text-gray-400">NIT {nit}</p>}
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs font-medium text-gray-500">BCWork · Reporte</p>
          <p className="mt-0.5 text-xs text-gray-400">
            Generado: {formatDate(generatedAt.toISOString())}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {period && <p className="text-sm text-gray-500">{period}</p>}
      </div>
    </div>
  )
}

interface ReportFooterProps {
  companyName: string
  pageInfo?: string
}

export function ReportFooter({ companyName, pageInfo }: ReportFooterProps) {
  return (
    <div className="mt-8 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{companyName} · Confidencial</span>
        <span>BCWork — Plataforma de Control de Teletrabajo</span>
        {pageInfo && <span>{pageInfo}</span>}
      </div>
    </div>
  )
}
