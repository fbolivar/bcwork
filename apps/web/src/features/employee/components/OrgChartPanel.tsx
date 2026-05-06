'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Users, Search, ChevronDown, ChevronRight } from 'lucide-react'

type OrgUser = {
  id: string
  full_name: string
  email: string
  role: string
  department: string | null
  position: string | null
  status: string | null
  manager_id: string | null
}

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Admin',
  manager: 'Manager',
  employee: 'Empleado',
}

const ROLE_COLORS: Record<string, string> = {
  tenant_admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-600',
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function UserCard({
  user,
  children,
  depth = 0,
}: {
  user: OrgUser
  children?: React.ReactNode
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = !!children
  const indent = depth * 24

  return (
    <div>
      <div
        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
        style={{ marginLeft: indent }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
          {initials(user.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{user.full_name}</p>
          <p className="truncate text-xs text-gray-400">
            {user.position ?? user.department ?? user.email}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role] ?? ROLE_COLORS.employee}`}
        >
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>
      {expanded && hasChildren && <div className="mt-1.5 space-y-1.5">{children}</div>}
    </div>
  )
}

function buildTree(users: OrgUser[], managerId: string | null, depth: number): React.ReactNode {
  const children = users.filter((u) => u.manager_id === managerId)
  if (children.length === 0) return null
  return (
    <>
      {children.map((u) => (
        <UserCard key={u.id} user={u} depth={depth}>
          {buildTree(users, u.id, depth + 1)}
        </UserCard>
      ))}
    </>
  )
}

function groupByDept(users: OrgUser[]) {
  const map = new Map<string, OrgUser[]>()
  for (const u of users) {
    const dept = u.department ?? 'Sin departamento'
    if (!map.has(dept)) map.set(dept, [])
    map.get(dept)!.push(u)
  }
  return map
}

export function OrgChartPanel() {
  const [view, setView] = useState<'tree' | 'directory'>('directory')
  const [search, setSearch] = useState('')

  const { data: users, isLoading } = trpc.employee.getOrgChart.useQuery()

  const filtered = (users ?? []).filter(
    (u) =>
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.position ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.department ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const roots = (users ?? []).filter(
    (u) => !u.manager_id || !(users ?? []).find((m) => m.id === u.manager_id),
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Directorio del equipo</h1>
        <p className="mt-0.5 text-sm text-gray-500">Estructura y contactos de tu organización</p>
      </div>

      {!isLoading && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Total personas</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">{(users ?? []).length}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Departamentos</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">
              {new Set((users ?? []).map((u) => u.department).filter(Boolean)).size}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar persona, cargo, área..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
          {(['directory', 'tree'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {v === 'directory' ? 'Directorio' : 'Organigrama'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <Users className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Sin resultados</p>
        </div>
      ) : view === 'directory' ? (
        <div className="space-y-5">
          {Array.from(groupByDept(filtered)).map(([dept, deptUsers]) => (
            <div key={dept}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {dept}
              </p>
              <div className="space-y-1.5">
                {deptUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {initials(u.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{u.full_name}</p>
                      <p className="truncate text-xs text-gray-400">{u.position ?? u.email}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? ROLE_COLORS.employee}`}
                    >
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {roots.map((r) => (
            <UserCard key={r.id} user={r} depth={0}>
              {buildTree(users ?? [], r.id, 1)}
            </UserCard>
          ))}
        </div>
      )}
    </div>
  )
}
