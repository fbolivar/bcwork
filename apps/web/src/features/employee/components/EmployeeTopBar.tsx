'use client'

import { NotificationBell } from '@/features/shared/components/NotificationBell'

export function EmployeeTopBar() {
  return (
    <div className="flex h-12 shrink-0 items-center justify-end border-b border-gray-200 bg-white px-6">
      <NotificationBell />
    </div>
  )
}
