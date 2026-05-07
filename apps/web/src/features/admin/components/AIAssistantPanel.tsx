'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo, useState, useRef, useEffect, type FormEvent } from 'react'
import {
  Bot,
  Send,
  User,
  Sparkles,
  RotateCcw,
  Users,
  CalendarOff,
  Target,
  Star,
} from 'lucide-react'

const SUGGESTED_PROMPTS = [
  { icon: Users, text: '¿Cuántos empleados activos tenemos?' },
  { icon: CalendarOff, text: '¿Hay solicitudes de ausencia pendientes de aprobar?' },
  { icon: Target, text: '¿Cómo van los objetivos del equipo?' },
  { icon: Star, text: '¿Hay evaluaciones de desempeño pendientes?' },
]

function getMessageText(message: ReturnType<typeof useChat>['messages'][0]): string {
  if (!message.parts) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

function MarkdownText({ text }: { text: string }) {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(
      /`(.*?)`/g,
      '<code class="rounded bg-gray-100 px-1 py-0.5 text-xs font-mono text-blue-700">$1</code>',
    )
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-1 space-y-0.5">$&</ul>')
    .replace(/\n/g, '<br>')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

const TRANSPORT = new DefaultChatTransport({ api: '/api/ai-assistant' })

export function AIAssistantPanel() {
  const transport = useMemo(() => TRANSPORT, [])
  const { messages, status, error, sendMessage } = useChat({ transport })
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isLoading = status === 'submitted' || status === 'streaming'
  const isEmpty = messages.length === 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    sendMessage({ text })
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleSuggestion = (text: string) => {
    sendMessage({ text })
  }

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Asistente HR</h3>
          <p className="text-xs text-gray-400">Powered by BCWork AI</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            title="Nueva conversación"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Nueva
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50">
              <Sparkles className="h-7 w-7 text-blue-500" />
            </div>
            <h4 className="mb-1 text-base font-semibold text-gray-800">
              ¿En qué puedo ayudarte hoy?
            </h4>
            <p className="mb-6 max-w-sm text-sm text-gray-400">
              Pregúntame sobre tus empleados, ausencias, objetivos, evaluaciones o cualquier dato de
              HR de tu empresa.
            </p>
            <div className="grid w-full max-w-sm gap-2 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => handleSuggestion(text)}
                  className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-left text-xs text-gray-600 transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => {
              const text = getMessageText(m)
              const isUser = m.role === 'user'
              return (
                <div key={m.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                    }`}
                  >
                    {isUser ? (
                      <User className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'rounded-tr-sm bg-blue-500 text-white'
                        : 'rounded-tl-sm bg-gray-50 text-gray-800'
                    }`}
                  >
                    {isUser ? text : <MarkdownText text={text} />}
                  </div>
                </div>
              )
            })}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error.message?.includes('AI no configurado')
                  ? 'El asistente AI no está configurado. Agrega OPENROUTER_API_KEY en las variables de entorno.'
                  : `Error: ${error.message}`}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-100 px-4 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 transition-colors focus-within:border-blue-300 focus-within:bg-white">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta algo sobre tu equipo..."
            disabled={isLoading}
            rows={1}
            className="max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            aria-label="Enviar mensaje"
            disabled={isLoading || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-300">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </form>
    </div>
  )
}
