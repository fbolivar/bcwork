'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { StickyNote, Trash2, Plus } from 'lucide-react'

function formatTs(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TenantNotes({ tenantId }: { tenantId: string }) {
  const utils = trpc.useUtils()
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)

  const { data: notes, isLoading } = trpc.platform.getTenantNotes.useQuery({ tenantId })

  const createMutation = trpc.platform.createTenantNote.useMutation({
    onSuccess: () => {
      setText('')
      setAdding(false)
      utils.platform.getTenantNotes.invalidate({ tenantId })
    },
  })

  const deleteMutation = trpc.platform.deleteTenantNote.useMutation({
    onSuccess: () => utils.platform.getTenantNotes.invalidate({ tenantId }),
  })

  type NoteRow = {
    id: string
    content: string
    created_at: string
    author_id: string | null
    users: { full_name: string | null; email: string } | null
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Notas internas</h2>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-4 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Escribe una nota privada sobre este cliente..."
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{text.length}/2000</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdding(false)
                  setText('')
                }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!text.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ tenantId, content: text })}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <div className="h-16 animate-pulse rounded-lg bg-gray-100" />}

      {!isLoading && (!notes || notes.length === 0) && !adding && (
        <p className="text-xs text-gray-400">Sin notas. Agrega contexto sobre este cliente.</p>
      )}

      <div className="space-y-3">
        {(notes as NoteRow[] | undefined)?.map((note) => (
          <div key={note.id} className="group relative rounded-lg bg-amber-50 px-4 py-3">
            <p className="whitespace-pre-wrap text-sm text-gray-800">{note.content}</p>
            <p className="mt-1.5 text-xs text-gray-400">
              {note.users?.full_name ?? note.users?.email ?? 'Admin'} · {formatTs(note.created_at)}
            </p>
            <button
              type="button"
              onClick={() => deleteMutation.mutate({ noteId: note.id })}
              disabled={deleteMutation.isPending}
              className="absolute right-2 top-2 hidden rounded p-1 text-gray-300 hover:bg-amber-100 hover:text-red-500 group-hover:flex"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
