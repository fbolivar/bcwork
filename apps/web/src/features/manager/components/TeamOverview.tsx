'use client'

import { useState, useMemo, Fragment } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Activity, Clock, TrendingUp, X, Monitor, Download } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtElapsed(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m activo`
  return `${m}m activo`
}

function RatioBar({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs tabular-nums text-gray-600">{pct}%</span>
    </div>
  )
}

// ── Mini Sparkline ─────────────────────────────────────────────────────────────

function MiniSparkline({ values, color = '#3b82f6' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 0.01)
  const W = 80
  const H = 28
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * W},${H - Math.max((v / max) * H, 1)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── User Detail Panel ─────────────────────────────────────────────────────────

function UserDetail({
  userId,
  days,
  onClose,
}: {
  userId: string
  days: number
  onClose: () => void
}) {
  const detail = trpc.manager.getUserDetail.useQuery({ userId, days })
  const d = detail.data

  const prodValues = ((d?.metrics ?? []) as Array<{ productivity_ratio: number }>).map((m) =>
    Math.round(m.productivity_ratio * 100),
  )
  const lastMetric = d?.metrics.at(-1) as { domains_top?: unknown; apps_top?: unknown } | undefined
  const topDomains = (
    Array.isArray(lastMetric?.domains_top)
      ? (lastMetric!.domains_top as Array<{ domain: string; secs: number }>)
      : []
  ).slice(0, 6)
  const topApps = (
    Array.isArray(lastMetric?.apps_top)
      ? (lastMetric!.apps_top as Array<{ identifier: string; secs: number }>)
      : []
  ).slice(0, 5)

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-blue-900">
            {d?.user.full_name ?? d?.user.email ?? '...'}
          </h3>
          {d?.user.department && <p className="text-xs text-blue-600">{d.user.department}</p>}
        </div>
        <button
          type="button"
          title="Cerrar detalle"
          onClick={onClose}
          className="rounded p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {detail.isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-blue-100" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Sparkline productividad */}
          <div className="rounded-lg bg-white p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">Productividad {days}d</p>
            {prodValues.length >= 2 ? (
              <div>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-bold text-gray-900">{prodValues.at(-1) ?? 0}%</span>
                  <MiniSparkline values={prodValues} color="#3b82f6" />
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Sin datos</p>
            )}
          </div>

          {/* Dispositivos */}
          <div className="rounded-lg bg-white p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">Dispositivos</p>
            <p className="text-xl font-bold text-gray-900">{d?.devices.length ?? 0}</p>
            {d?.devices.map((dev) => (
              <p key={dev.id} className="text-xs text-gray-400">
                {dev.hostname ?? dev.name} · {dev.platform}
              </p>
            ))}
          </div>

          {/* Último acceso */}
          <div className="rounded-lg bg-white p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">Último acceso</p>
            <p className="text-sm font-semibold text-gray-900">
              {d?.user.last_login_at
                ? new Date(d.user.last_login_at).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Nunca'}
            </p>
            {d?.user.position && <p className="mt-1 text-xs text-gray-400">{d.user.position}</p>}
          </div>
        </div>
      )}

      {/* Top domains */}
      {topDomains.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-blue-800">
            Dominios más visitados (último día con datos)
          </p>
          <div className="space-y-1.5">
            {topDomains.map((d) => {
              const maxSecs = topDomains[0]?.secs ?? 1
              return (
                <div key={d.domain} className="flex items-center gap-2">
                  <span className="w-32 truncate text-xs text-gray-600">{d.domain}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${(d.secs / maxSecs) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs text-gray-500">{fmtHours(d.secs)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top apps */}
      {topApps.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-blue-800">Apps más usadas</p>
          <div className="flex flex-wrap gap-1.5">
            {topApps.map((a) => (
              <span
                key={a.identifier}
                className="rounded-full border border-blue-100 bg-white px-2 py-0.5 text-xs text-gray-600"
              >
                {(a.identifier ?? '').split('.').slice(-2).join('.')} · {fmtHours(a.secs)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── CSV Export ────────────────────────────────────────────────────────────────

type UserStat = {
  full_name: string | null
  email: string
  department: string | null
  active_seconds: number
  productivity_ratio: number
  overtime_seconds: number
  days_active: number
  focus_score: number | null
}

function exportTeamCSV(users: UserStat[], days: number) {
  const headers = [
    'Nombre',
    'Email',
    'Departamento',
    'Tiempo activo',
    'Productividad',
    'Horas extra',
    'Días activos',
    'Focus',
  ]
  const rows = users.map((u) => [
    u.full_name ?? '',
    u.email,
    u.department ?? '',
    fmtHours(u.active_seconds),
    `${Math.round(u.productivity_ratio * 100)}%`,
    u.overtime_seconds > 60 ? fmtHours(u.overtime_seconds) : '0',
    String(u.days_active),
    u.focus_score != null ? String(Math.round(u.focus_score)) : '—',
  ])
  const csv =
    '﻿' +
    [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `equipo-${days}d-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── TeamOverview ──────────────────────────────────────────────────────────────

type SortKey = 'name' | 'active_seconds' | 'productivity_ratio' | 'overtime_seconds' | 'days_active'

interface Props {
  teamId?: string
}

export function TeamOverview({ teamId }: Props) {
  const [days, setDays] = useState(7)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('active_seconds')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const metrics = trpc.manager.getTeamMetrics.useQuery(
    { teamId, days },
    { refetchInterval: 300_000 },
  )
  const sessions = trpc.manager.getActiveSessions.useQuery({ teamId }, { refetchInterval: 30_000 })

  const { users = [], summary } = metrics.data ?? {}
  const activeSessions = sessions.data ?? []

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let va: number | string = 0
      let vb: number | string = 0
      if (sortKey === 'name') {
        va = a.full_name ?? a.email ?? ''
        vb = b.full_name ?? b.email ?? ''
      } else if (sortKey === 'active_seconds') {
        va = a.active_seconds
        vb = b.active_seconds
      } else if (sortKey === 'productivity_ratio') {
        va = a.productivity_ratio
        vb = b.productivity_ratio
      } else if (sortKey === 'overtime_seconds') {
        va = a.overtime_seconds
        vb = b.overtime_seconds
      } else if (sortKey === 'days_active') {
        va = a.days_active
        vb = b.days_active
      }
      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
  }, [users, sortKey, sortDir])

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDays(d)
                  setSelectedUserId(null)
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  days === d ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          {users.length > 0 && (
            <button
              type="button"
              onClick={() => exportTeamCSV(users, days)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          )}
        </div>
        {summary && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>
              <strong className="text-gray-900">{summary.members_count}</strong> miembros con datos
            </span>
            <span>
              Productividad:{' '}
              <strong
                className={`${summary.avg_productivity_ratio >= 0.7 ? 'text-green-600' : summary.avg_productivity_ratio >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`}
              >
                {Math.round(summary.avg_productivity_ratio * 100)}%
              </strong>
            </span>
            <span>
              Tiempo activo:{' '}
              <strong className="text-gray-900">{fmtHours(summary.total_active_seconds)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Live sessions banner */}
      {activeSessions.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800">
              {activeSessions.length} sesión{activeSessions.length !== 1 ? 'es' : ''} activa
              {activeSessions.length !== 1 ? 's' : ''} ahora
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-green-100 bg-white px-3 py-1.5 text-xs shadow-sm"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                <span className="font-medium text-gray-800">{s.full_name ?? s.email}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{fmtElapsed(s.elapsed_seconds)}</span>
                <Monitor className="h-3 w-3 text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members table */}
      {metrics.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <TrendingUp className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">
            Sin actividad registrada en los últimos {days} días
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Verifica que el agente esté instalado y activo
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {(
                  [
                    { label: 'Colaborador', col: 'name' as SortKey },
                    { label: 'Tiempo activo', col: 'active_seconds' as SortKey },
                    { label: 'Productividad', col: 'productivity_ratio' as SortKey },
                    { label: 'Focus', col: null },
                    { label: 'Horas extra', col: 'overtime_seconds' as SortKey },
                    { label: 'Días', col: 'days_active' as SortKey },
                  ] as Array<{ label: string; col: SortKey | null }>
                ).map(({ label, col }) =>
                  col ? (
                    <th
                      key={label}
                      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600"
                      onClick={() => handleSort(col)}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        <span className="tabular-nums">
                          {sortKey === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                        </span>
                      </span>
                    </th>
                  ) : (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedUsers.map((u) => {
                const isSelected = selectedUserId === u.user_id
                return (
                  <Fragment key={u.user_id}>
                    <tr
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => setSelectedUserId(isSelected ? null : u.user_id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                            {(u.full_name ?? u.email ?? '?')[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.full_name ?? '—'}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-700">
                        {fmtHours(u.active_seconds)}
                      </td>
                      <td className="px-4 py-3">
                        <RatioBar ratio={u.productivity_ratio} />
                      </td>
                      <td className="px-4 py-3">
                        {u.focus_score != null ? (
                          <span
                            className={`text-sm font-semibold ${u.focus_score >= 70 ? 'text-green-600' : u.focus_score >= 50 ? 'text-yellow-600' : 'text-red-500'}`}
                          >
                            {Math.round(u.focus_score)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-xs tabular-nums ${u.overtime_seconds > 3600 ? 'font-medium text-red-500' : 'text-gray-400'}`}
                      >
                        {u.overtime_seconds > 60 ? fmtHours(u.overtime_seconds) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{u.days_active}d</td>
                    </tr>
                    {isSelected && (
                      <tr key={`${u.user_id}-detail`}>
                        <td colSpan={6} className="px-4 pb-4 pt-1">
                          <UserDetail
                            userId={u.user_id}
                            days={days}
                            onClose={() => setSelectedUserId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
