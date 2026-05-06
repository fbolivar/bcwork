'use client'

import { trpc } from '@/lib/trpc-client'
import { Heart } from 'lucide-react'

type KudosValue = 'teamwork' | 'innovation' | 'excellence' | 'leadership' | 'helpfulness' | 'other'

const VALUE_LABELS: Record<KudosValue, { label: string; color: string }> = {
  teamwork: { label: 'Trabajo en equipo', color: 'bg-blue-100 text-blue-700' },
  innovation: { label: 'Innovación', color: 'bg-yellow-100 text-yellow-700' },
  excellence: { label: 'Excelencia', color: 'bg-orange-100 text-orange-700' },
  leadership: { label: 'Liderazgo', color: 'bg-purple-100 text-purple-700' },
  helpfulness: { label: 'Apoyo', color: 'bg-green-100 text-green-700' },
  other: { label: 'Otro', color: 'bg-gray-100 text-gray-600' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminKudosFeed() {
  const { data: feed, isLoading } = trpc.admin.getAdminKudosFeed.useQuery({ limit: 100 })

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Reconocimiento del equipo</h2>
        <p className="mt-0.5 text-sm text-gray-500">Todos los kudos enviados en tu organización</p>
      </div>

      {!isLoading && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3">
            <p className="text-xs text-pink-600">Total kudos</p>
            <p className="mt-0.5 text-2xl font-bold text-pink-700">{(feed ?? []).length}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (feed ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <Heart className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay kudos aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(feed ?? []).map((k) => {
            const val = VALUE_LABELS[k.value as KudosValue] ?? VALUE_LABELS.other
            const fromUser = (k as { from_user?: { id: string; full_name: string } | null })
              .from_user
            const toUser = (k as { to_user?: { id: string; full_name: string } | null }).to_user
            return (
              <div key={k.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-semibold text-pink-700">
                    {(fromUser?.full_name ?? 'U')[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">{fromUser?.full_name}</span>
                      {' → '}
                      <span className="font-semibold text-gray-900">{toUser?.full_name}</span>
                    </p>
                    <p className="mt-1 text-sm italic text-gray-600">"{k.message}"</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${val.color}`}
                      >
                        {val.label}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDate(k.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
