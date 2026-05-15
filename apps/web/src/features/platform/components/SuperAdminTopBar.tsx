'use client'

import { trpc } from '@/lib/trpc-client'
import { Shield } from 'lucide-react'

export function SuperAdminTopBar() {
  const { data: me } = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60 * 1000 })

  return (
    <header className="flex h-12 shrink-0 items-center justify-end gap-3 border-b border-gray-200 bg-white px-6">
      {me && (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <span className="text-xs text-gray-500">{me.email}</span>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
            Platform Admin
          </span>
        </div>
      )}
    </header>
  )
}
