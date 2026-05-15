'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ShieldAlert, LogOut } from 'lucide-react'

export function ImpersonationBanner() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function exit() {
    setLoading(true)
    await fetch('/api/auth/impersonate', { method: 'DELETE' })
    router.push('/super-admin/tenants')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3 bg-amber-500 px-5 py-2">
      <ShieldAlert className="h-4 w-4 shrink-0 text-white" />
      <p className="flex-1 text-xs font-semibold text-white">
        Estás viendo la cuenta como <strong>tenant_admin</strong>. Esta sesión es temporal (1 hora).
      </p>
      <button
        type="button"
        onClick={exit}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/30 disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" />
        {loading ? 'Saliendo...' : 'Salir de impersonación'}
      </button>
    </div>
  )
}
