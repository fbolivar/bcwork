'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWABanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('pwa-dismissed')) {
      setDismissed(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (dismissed || !prompt) return null

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setPrompt(null)
    }
  }

  function dismiss() {
    localStorage.setItem('pwa-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-cyan-200 bg-white px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:w-80">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50">
        <Download className="h-4 w-4 text-cyan-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">Instalar BCWork</p>
        <p className="text-xs text-gray-500">Accede sin abrir el navegador</p>
      </div>
      <button
        type="button"
        onClick={() => void install()}
        className="shrink-0 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700"
      >
        Instalar
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-gray-400 hover:text-gray-600"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
