'use client'

import { useState, useEffect, useRef } from 'react'
import { trpc } from '@/lib/trpc-client'
import { MessageSquare, Send, ChevronLeft } from 'lucide-react'

export function TeamMessagesPanel() {
  const utils = trpc.useUtils()
  const [selectedPeer, setSelectedPeer] = useState<{ id: string; name: string } | null>(null)
  const [body, setBody] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { data: meData } = trpc.employee.getMyProfile.useQuery()
  const myId = (meData as any)?.id ?? ''

  const { data: conversations } = trpc.manager.getTeamConversations.useQuery(undefined, {
    refetchInterval: 10000,
  })

  const { data: messages, refetch } = trpc.manager.getConversation.useQuery(
    { peer_id: selectedPeer?.id ?? '' },
    { enabled: !!selectedPeer, refetchInterval: 5000 },
  )

  const send = trpc.manager.sendMessage.useMutation({
    onSuccess: () => {
      setBody('')
      refetch()
      utils.manager.getTeamConversations.invalidate()
    },
  })

  const markRead = trpc.manager.markConversationRead.useMutation()

  useEffect(() => {
    if (selectedPeer) {
      markRead.mutate({ peer_id: selectedPeer.id })
      utils.manager.getTeamConversations.invalidate()
    }
  }, [selectedPeer?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const allConvs = (conversations ?? []) as any[]
  const allMsgs = (messages ?? []) as any[]

  if (selectedPeer) {
    return (
      <div className="flex h-[600px] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={() => setSelectedPeer(null)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {selectedPeer.name.charAt(0).toUpperCase()}
          </div>
          <p className="text-sm font-medium text-gray-800">{selectedPeer.name}</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {allMsgs.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">Inicia la conversación</p>
            </div>
          )}
          {allMsgs.map((msg: any) => {
            const isMine = msg.from_user_id === myId
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                >
                  <p>{msg.body}</p>
                  <p className={`mt-0.5 text-[10px] ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-100 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && body.trim()) {
                  e.preventDefault()
                  send.mutate({ to_user_id: selectedPeer.id, body: body.trim() })
                }
              }}
              placeholder="Escribe un mensaje..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              disabled={!body.trim() || send.isPending}
              onClick={() => send.mutate({ to_user_id: selectedPeer.id, body: body.trim() })}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Mensajes</h2>
        <p className="mt-0.5 text-sm text-gray-500">Conversaciones con tu equipo</p>
      </div>

      {allConvs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay conversaciones aún</p>
        </div>
      ) : (
        <div className="space-y-1">
          {allConvs.map((conv: any) => (
            <button
              key={conv.peer_id}
              type="button"
              onClick={() => setSelectedPeer({ id: conv.peer_id, name: conv.peer_name })}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-left hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {conv.peer_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800">{conv.peer_name}</p>
                <p className="truncate text-xs text-gray-400">{conv.last_message}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <p className="text-[10px] text-gray-400">
                  {new Date(conv.last_at).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </p>
                {conv.unread_count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
