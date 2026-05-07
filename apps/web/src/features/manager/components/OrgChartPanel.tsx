'use client'

import { useMemo } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Network } from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  tenant_admin: 'border-purple-300 bg-purple-50',
  manager: 'border-blue-300 bg-blue-50',
  employee: 'border-gray-200 bg-white',
}

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Admin',
  manager: 'Manager',
  employee: 'Empleado',
}

function UserCard({ user, depth = 0 }: { user: any; depth?: number }) {
  const border = ROLE_COLORS[user.role] ?? ROLE_COLORS.employee
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${border} min-w-[160px] max-w-[200px]`}>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
          {(user.full_name ?? user.email ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-800">
            {user.full_name ?? user.email}
          </p>
          <p className="truncate text-[10px] text-gray-400">
            {user.position ?? ROLE_LABELS[user.role] ?? user.role}
          </p>
        </div>
      </div>
      {user.department && (
        <p className="mt-1 truncate text-[9px] text-gray-400">{user.department}</p>
      )}
    </div>
  )
}

function OrgNode({
  user,
  childrenMap,
  depth = 0,
}: {
  user: any
  childrenMap: Map<string | null, any[]>
  depth?: number
}) {
  const children = childrenMap.get(user.id) ?? []
  return (
    <div className="flex flex-col items-center">
      <UserCard user={user} depth={depth} />
      {children.length > 0 && (
        <>
          <div className="h-5 w-px bg-gray-200" />
          <div className="relative flex gap-6">
            {children.length > 1 && (
              <div className="absolute left-0 right-0 top-0 h-px bg-gray-200" style={{ top: 0 }} />
            )}
            {children.map((child: any, i: number) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="h-5 w-px bg-gray-200" />
                <OrgNode user={child} childrenMap={childrenMap} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function OrgChartPanel() {
  const { data, isLoading } = trpc.manager.getTeamOrgChart.useQuery({})
  const users = (data ?? []) as any[]

  const { roots, childrenMap } = useMemo(() => {
    const map = new Map<string | null, any[]>()
    const allIds = new Set(users.map((u) => u.id))
    for (const u of users) {
      const parentId = u.manager_id && allIds.has(u.manager_id) ? u.manager_id : null
      if (!map.has(parentId)) map.set(parentId, [])
      map.get(parentId)!.push(u)
    }
    return { roots: map.get(null) ?? [], childrenMap: map }
  }, [users])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Organigrama</h2>
        <p className="mt-0.5 text-sm text-gray-500">Estructura jerárquica del equipo</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded border ${ROLE_COLORS[role]}`} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Network className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Sin empleados en el organigrama</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 p-6">
          <div className="inline-flex min-w-full flex-col items-center gap-1">
            {roots.length > 0 ? (
              <div className="flex gap-8">
                {roots.map((root: any) => (
                  <OrgNode key={root.id} user={root} childrenMap={childrenMap} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                {users.map((u) => (
                  <UserCard key={u.id} user={u} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* List view for mobile/overflow */}
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Empleado</th>
              <th className="px-4 py-2.5 text-left font-medium">Cargo</th>
              <th className="px-4 py-2.5 text-left font-medium">Departamento</th>
              <th className="px-4 py-2.5 text-left font-medium">Reporta a</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {users.map((u) => {
              const manager = users.find((m) => m.id === u.manager_id)
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                        {(u.full_name ?? u.email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-800">{u.full_name ?? u.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{u.position ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{u.department ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {manager ? (manager.full_name ?? manager.email) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
