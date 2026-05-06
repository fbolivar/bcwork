'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Megaphone, Plus, X, Trash2, Pin } from 'lucide-react'

export function AnnouncementsManager() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')

  const { data: announcements, isLoading } = trpc.admin.listAnnouncements.useQuery()

  const create = trpc.admin.createAnnouncement.useMutation({
    onSuccess: () => {
      utils.admin.listAnnouncements.invalidate()
      setShowCreate(false)
      setTitle('')
      setBody('')
      setPinned(false)
      setExpiresAt('')
    },
  })

  const remove = trpc.admin.deleteAnnouncement.useMutation({
    onSuccess: () => utils.admin.listAnnouncements.invalidate(),
  })

  const all = (announcements ?? []) as any[]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Anuncios</h2>
          <p className="mt-0.5 text-sm text-gray-500">Publica comunicados para todo el equipo</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo anuncio
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay anuncios publicados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {all.map((a: any) => (
            <div
              key={a.id}
              className={`rounded-xl border p-4 ${a.pinned ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.pinned && <Pin className="h-3.5 w-3.5 text-blue-500" />}
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{a.body}</p>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {new Date(a.published_at).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {a.expires_at &&
                      ` · Vence ${new Date(a.expires_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`}
                  </p>
                </div>
                <button
                  type="button"
                  title="Eliminar"
                  onClick={() => remove.mutate({ id: a.id })}
                  disabled={remove.isPending}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nuevo anuncio</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="ann-title" className="text-xs font-medium text-gray-700">
                  Título
                </label>
                <input
                  id="ann-title"
                  type="text"
                  placeholder="Ej: Reunión general del equipo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="ann-body" className="text-xs font-medium text-gray-700">
                  Contenido
                </label>
                <textarea
                  id="ann-body"
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Escribe el comunicado aquí..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  Fijar anuncio
                </label>
                <div className="flex-1">
                  <label htmlFor="ann-exp" className="text-xs font-medium text-gray-700">
                    Vence (opcional)
                  </label>
                  <input
                    id="ann-exp"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!title.trim() || !body.trim() || create.isPending}
                onClick={() =>
                  create.mutate({
                    title,
                    body,
                    pinned,
                    expires_at: expiresAt
                      ? new Date(expiresAt + 'T23:59:59').toISOString()
                      : undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
