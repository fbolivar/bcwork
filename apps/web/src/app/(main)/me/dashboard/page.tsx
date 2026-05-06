'use client'

import { trpc } from '@/lib/trpc-client'
import { MyDayPanel } from '@/features/employee/components/MyDayPanel'

function greeting(name: string | null | undefined) {
  const hour = new Date().getHours()
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  return name ? `${saludo}, ${name.split(' ')[0]}` : saludo
}

export default function EmployeeDashboard() {
  const { data: profile } = trpc.employee.getMyProfile.useQuery()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{greeting(profile?.full_name)} 👋</h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>
      <MyDayPanel />
    </div>
  )
}
