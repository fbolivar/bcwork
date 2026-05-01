'use client'

interface UserMetric {
  user_id: string
  full_name: string | null
  email: string
  department: string | null
  active_seconds: number
  productive_seconds: number
  productivity_ratio: number
  focus_score: number
  overtime_seconds: number
  days_active: number
}

interface Props {
  users: UserMetric[]
}

function fmtHours(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function RatioBar({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-600">{pct}%</span>
    </div>
  )
}

export function TopUsersTable({ users }: Props) {
  if (users.length === 0) {
    return <p className="text-sm text-gray-400">Sin datos disponibles</p>
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div
          key={u.user_id}
          className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-800">{u.full_name ?? u.email}</p>
            {u.department && <p className="text-xs text-gray-400">{u.department}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <RatioBar ratio={u.productivity_ratio} />
            <span className="text-xs text-gray-400">{fmtHours(u.active_seconds)} activo</span>
          </div>
        </div>
      ))}
    </div>
  )
}
