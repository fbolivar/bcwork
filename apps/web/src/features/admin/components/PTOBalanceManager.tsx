'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Edit2, X, Save, CalendarDays } from 'lucide-react'

type Employee = {
  id: string
  full_name: string | null
  email: string
  department: string | null
  position: string | null
}

function EditBalanceModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const utils = trpc.useUtils()
  const year = new Date().getFullYear()
  const [vacTotal, setVacTotal] = useState(15)
  const [vacUsed, setVacUsed] = useState(0)
  const [sickTotal, setSickTotal] = useState(15)
  const [sickUsed, setSickUsed] = useState(0)

  const update = trpc.admin.updatePTOBalance.useMutation({
    onSuccess: () => {
      void utils.admin.listUsers.invalidate()
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Balance PTO — {year}</h3>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">{employee.full_name ?? employee.email}</p>
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Vacaciones
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pto-vac-total" className="text-xs text-gray-600">
                  Total días
                </label>
                <input
                  id="pto-vac-total"
                  type="number"
                  min={0}
                  max={365}
                  value={vacTotal}
                  onChange={(e) => setVacTotal(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="pto-vac-used" className="text-xs text-gray-600">
                  Días usados
                </label>
                <input
                  id="pto-vac-used"
                  type="number"
                  min={0}
                  max={vacTotal}
                  value={vacUsed}
                  onChange={(e) => setVacUsed(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Incapacidad
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pto-sick-total" className="text-xs text-gray-600">
                  Total días
                </label>
                <input
                  id="pto-sick-total"
                  type="number"
                  min={0}
                  max={365}
                  value={sickTotal}
                  onChange={(e) => setSickTotal(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="pto-sick-used" className="text-xs text-gray-600">
                  Días usados
                </label>
                <input
                  id="pto-sick-used"
                  type="number"
                  min={0}
                  max={sickTotal}
                  value={sickUsed}
                  onChange={(e) => setSickUsed(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                employee_id: employee.id,
                year,
                vacation_days_total: vacTotal,
                vacation_days_used: vacUsed,
                sick_days_total: sickTotal,
                sick_days_used: sickUsed,
              })
            }
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PTOBalanceManager() {
  const [editing, setEditing] = useState<Employee | null>(null)
  const { data: usersResult, isLoading } = trpc.admin.listUsers.useQuery({ pageSize: 100 })
  const employees =
    usersResult?.data?.filter((u) => u.role === 'employee' && u.status === 'active') ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Balance de PTO</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Gestiona los días de vacaciones e incapacidad por empleado
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : employees.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Empleado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Departamento</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{emp.full_name ?? 'Sin nombre'}</p>
                    <p className="text-xs text-gray-400">{emp.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{emp.department ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          id: emp.id,
                          full_name: emp.full_name ?? null,
                          email: emp.email,
                          department: emp.department ?? null,
                          position: emp.position ?? null,
                        })
                      }
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <Edit2 className="h-3 w-3" /> Editar balance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Sin empleados activos</p>
        </div>
      )}

      {editing && <EditBalanceModal employee={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
