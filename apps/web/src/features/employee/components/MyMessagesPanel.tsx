'use client'

import { useState, useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Send, MessageSquare, ArrowLeft, User } from 'lucide-react'

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

function RoleTag({ role }: { role: string }) {
  const labels: Record<string, string> = {
    tenant_admin: 'Admin',
    manager: 'Manager',
    employee: 'Empleado',
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
      {labels[role] ?? role}
    </span>
  )
}

function ChatWindow({
  withUserId,
  withName,
  withRole,
  onBack,
}: {
  withUserId: string
  withName: string
  withRole: string
  onBack: () => void
}) {
  const utils = trpc.useUtils()
  const [body, setBody] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages, refetch } = trpc.employee.getConversation.useQuery(
    { withUserId, limit: 50, offset: 0 },
    { refetchInterval: 5000 },
  )

  const markRead = trpc.employee.markMessagesRead.useMutation()
  const send = trpc.employee.sendMessage.useMutation({
    onSuccess: () => {
      setBody('')
      void refetch()
      void utils.employee.getMyConversations.invalidate()
      void utils.employee.getMyUnreadMessageCount.invalidate()
    },
  })

  useEffect(() => {
    if (messages && messages.length > 0) {
      markRead.mutate({ fromUserId: withUserId })
      void utils.employee.getMyConversations.invalidate()
      void utils.employee.getMyUnreadMessageCount.invalidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages?.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const myId = messages?.find((m) => m.from_user_id !== withUserId)?.from_user_id

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    send.mutate({ toUserId: withUserId, body: body.trim() })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <User className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{withName}</p>
          <RoleTag role={withRole} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages && messages.length > 0 ? (
          messages.map((m) => {
            const isMine = m.from_user_id === myId
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMine
                      ? 'rounded-br-sm bg-blue-600 text-white'
                      : 'rounded-bl-sm bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`mt-1 text-right text-[10px] ${isMine ? 'text-blue-200' : 'text-gray-400'}`}
                  >
                    {fmtTime(m.created_at)}
                    {isMine && m.read_at && ' · Visto'}
                  </p>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageSquare className="mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">Inicia la conversación</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-200 bg-white p-3">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un mensaje…"
          maxLength={2000}
          className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!body.trim() || send.isPending}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

function NewConversationPicker({
  onSelect,
  onCancel,
}: {
  onSelect: (id: string, name: string, role: string) => void
  onCancel: () => void
}) {
  const { data: managers } = trpc.employee.getMyManagers.useQuery()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-gray-900">Nuevo mensaje</h3>
        <p className="mt-1 text-sm text-gray-500">Selecciona a quién escribir</p>
        <div className="mt-4 space-y-2">
          {managers?.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id, m.full_name ?? 'Usuario', m.role ?? 'manager')}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                <RoleTag role={m.role ?? ''} />
              </div>
            </button>
          ))}
          {(!managers || managers.length === 0) && (
            <p className="text-sm text-gray-400">No hay managers disponibles</p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

export function MyMessagesPanel() {
  const [selectedConv, setSelectedConv] = useState<{
    userId: string
    name: string
    role: string
  } | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  const { data: conversations, isLoading } = trpc.employee.getMyConversations.useQuery(undefined, {
    refetchInterval: 10000,
  })

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Sidebar */}
      <div
        className={`flex w-full flex-col border-r border-gray-200 lg:w-72 ${selectedConv ? 'hidden lg:flex' : 'flex'}`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h1 className="text-base font-semibold text-gray-900">Mensajes</h1>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            title="Nuevo mensaje"
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="animate-pulse space-y-1 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : conversations && conversations.length > 0 ? (
            conversations.map((c) => (
              <button
                key={c.userId}
                type="button"
                onClick={() =>
                  setSelectedConv({ userId: c.userId, name: c.fullName, role: c.role })
                }
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${selectedConv?.userId === c.userId ? 'bg-blue-50' : ''}`}
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-5 w-5 text-blue-600" />
                  {c.unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {c.unread > 9 ? '9+' : c.unread}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-gray-900">{c.fullName}</p>
                    <p className="shrink-0 text-[10px] text-gray-400">{fmtTime(c.lastAt)}</p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{c.lastMessage}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-400">Sin conversaciones</p>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="mt-3 text-sm font-medium text-blue-600 hover:underline"
              >
                Escribir a un manager
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 ${selectedConv ? 'flex' : 'hidden lg:flex'} flex-col`}>
        {selectedConv ? (
          <ChatWindow
            withUserId={selectedConv.userId}
            withName={selectedConv.name}
            withRole={selectedConv.role}
            onBack={() => setSelectedConv(null)}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <MessageSquare className="mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Selecciona una conversación</p>
            <p className="mt-1 text-xs text-gray-400">o escribe un nuevo mensaje</p>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Nuevo mensaje
            </button>
          </div>
        )}
      </div>

      {showPicker && (
        <NewConversationPicker
          onSelect={(id, name, role) => {
            setSelectedConv({ userId: id, name, role })
            setShowPicker(false)
          }}
          onCancel={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
