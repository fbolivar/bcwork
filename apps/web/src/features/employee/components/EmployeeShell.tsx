'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { EmployeeNav } from './EmployeeNav'
import { NotificationBell } from '@/features/shared/components/NotificationBell'
import { WorkplaceAlerts } from './WorkplaceAlerts'
import { WorkLocationGate } from './WorkLocationGate'

export function EmployeeShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-200 lg:relative lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <EmployeeNav onClose={() => setOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-4">
          <button
            type="button"
            title="Abrir menú"
            onClick={() => setOpen(true)}
            className="mr-3 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <NotificationBell />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-8">
            <WorkLocationGate>{children}</WorkLocationGate>
          </div>
        </main>
      </div>
      <WorkplaceAlerts />
    </div>
  )
}
