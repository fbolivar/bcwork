'use client'

import { trpc } from '@/lib/trpc-client'

type Grade = 'healthy' | 'at_risk' | 'critical'

const GRADE_CONFIG: Record<Grade, { label: string; className: string; dot: string }> = {
  healthy: {
    label: 'Saludable',
    className: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  at_risk: {
    label: 'En riesgo',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  critical: {
    label: 'Crítico',
    className: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
}

export function HealthScoreBadge({
  score,
  grade,
  showLabel = false,
}: {
  score: number
  grade: Grade
  showLabel?: boolean
}) {
  const cfg = GRADE_CONFIG[grade]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.className}`}
      title={`Health Score: ${score}/100`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {score}
      {showLabel && <span className="font-normal opacity-75">{cfg.label}</span>}
    </span>
  )
}

export function HealthScorePanel({ tenantId }: { tenantId: string }) {
  const { data } = trpc.platform.getHealthScores.useQuery(undefined, {
    refetchInterval: 300_000,
    select: (scores) => scores.find((s) => s.tenantId === tenantId),
  })

  if (!data) return null

  const cfg = GRADE_CONFIG[data.grade as Grade]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Health Score</h3>
      <div className="flex items-center gap-4">
        {/* Score ring */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-gray-100">
          <span className="text-xl font-bold text-gray-900">{data.score}</span>
          <span className="absolute -bottom-1 text-xs text-gray-400">/ 100</span>
        </div>
        <div className="flex-1 space-y-1">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
            <Stat label="Usuarios activos" value={`${data.activeUsers}/${data.totalUsers}`} />
            <Stat label="Sesiones 7 días" value={String(data.sessionsLast7d)} />
            <Stat
              label="Última sesión"
              value={
                data.lastSeenAt
                  ? new Date(data.lastSeenAt).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : 'Sin actividad'
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xs font-semibold text-gray-700">{value}</p>
    </div>
  )
}
