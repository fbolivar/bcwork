'use client'

import { AlertRulesManager } from '@/features/admin/components/AlertRulesManager'

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Alertas y reglas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura reglas automáticas que generan notificaciones cuando un empleado supera un
          umbral.
        </p>
      </div>
      <AlertRulesManager />
    </div>
  )
}
