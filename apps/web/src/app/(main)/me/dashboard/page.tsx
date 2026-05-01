'use client'

import { MyDayPanel } from '@/features/employee/components/MyDayPanel'

export default function EmployeeDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mi día</h1>
        <p className="mt-1 text-sm text-gray-500">Tu actividad y productividad de hoy</p>
      </div>
      <MyDayPanel />
    </div>
  )
}
