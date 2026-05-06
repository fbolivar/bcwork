'use client'

import { trpc } from '@/lib/trpc-client'
import { Megaphone, Pin } from 'lucide-react'

export function AnnouncementsPanel() {
  const { data: announcements, isLoading } = trpc.employee.getAnnouncements.useQuery()

  const all = (announcements ?? []) as any[]
  const pinned = all.filter((a) => a.pinned)
  const rest = all.filter((a) => !a.pinned)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Anuncios</h1>
        <p className="mt-0.5 text-sm text-gray-500">Comunicados y noticias de tu empresa</p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <Megaphone className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No hay anuncios publicados</p>
          <p className="mt-1 text-xs text-gray-400">Tu empresa publicará comunicados aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pinned.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fijados</p>
              {pinned.map((a: any) => (
                <AnnouncementCard key={a.id} a={a} />
              ))}
              {rest.length > 0 && (
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Recientes
                </p>
              )}
            </>
          )}
          {rest.map((a: any) => (
            <AnnouncementCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function AnnouncementCard({ a }: { a: any }) {
  return (
    <div
      className={`rounded-xl border p-4 ${a.pinned ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-white'}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.pinned ? 'bg-blue-100' : 'bg-gray-100'}`}
        >
          {a.pinned ? (
            <Pin className="h-4 w-4 text-blue-600" />
          ) : (
            <Megaphone className="h-4 w-4 text-gray-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{a.title}</p>
            {a.pinned && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                Fijado
              </span>
            )}
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{a.body}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            {a.author?.full_name && <span>{a.author.full_name}</span>}
            <span>·</span>
            <span>
              {new Date(a.published_at).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {a.expires_at && (
              <>
                <span>·</span>
                <span>
                  Vence{' '}
                  {new Date(a.expires_at).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
