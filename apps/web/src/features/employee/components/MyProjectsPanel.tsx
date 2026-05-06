'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, Clock, X, ChevronDown } from 'lucide-react'

function fmtHours(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

type Project = {
  id: string
  name: string
  color: string | null
  description?: string | null
  is_active?: boolean | null
  created_at?: string | null
}

function LogTimeModal({
  projects,
  onClose,
  onSaved,
}: {
  projects: Project[]
  onClose: () => void
  onSaved: () => void
}) {
  const utils = trpc.useUtils()
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [taskId, setTaskId] = useState('')
  const [startedAt, setStartedAt] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() - 1)
    return d.toISOString().slice(0, 16)
  })
  const [endedAt, setEndedAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const { data: tasks } = trpc.employee.getProjectTasks.useQuery(
    { project_id: projectId },
    { enabled: !!projectId },
  )

  const log = trpc.employee.logProjectTime.useMutation({
    onSuccess: () => {
      void utils.employee.getMyProjectEntries.invalidate()
      onSaved()
    },
    onError: (e) => setError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!projectId) {
      setError('Selecciona un proyecto')
      return
    }
    const start = new Date(startedAt)
    const end = new Date(endedAt)
    if (end <= start) {
      setError('La hora de fin debe ser posterior al inicio')
      return
    }
    log.mutate({
      project_id: projectId,
      task_id: taskId || undefined,
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Registrar tiempo en proyecto</h3>
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="project-select" className="text-xs font-medium text-gray-700">
              Proyecto
            </label>
            <div className="relative mt-1">
              <select
                id="project-select"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value)
                  setTaskId('')
                }}
                className="w-full appearance-none rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {tasks && tasks.length > 0 && (
            <div>
              <label htmlFor="task-select" className="text-xs font-medium text-gray-700">
                Tarea (opcional)
              </label>
              <div className="relative mt-1">
                <select
                  id="task-select"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin tarea específica</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="started-at" className="text-xs font-medium text-gray-700">
                Inicio
              </label>
              <input
                id="started-at"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="ended-at" className="text-xs font-medium text-gray-700">
                Fin
              </label>
              <input
                id="ended-at"
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes-input" className="text-xs font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              id="notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="¿En qué trabajaste?"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={log.isPending}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {log.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function MyProjectsPanel() {
  const [showLog, setShowLog] = useState(false)
  const [days, setDays] = useState(30)

  const { data: projects, isLoading: loadingProjects } = trpc.employee.getMyProjects.useQuery()
  const { data: entries, isLoading: loadingEntries } = trpc.employee.getMyProjectEntries.useQuery({
    days,
  })

  // Group entries by project
  type Entry = NonNullable<typeof entries>[number]
  const byProject = new Map<
    string,
    { name: string; color: string; secs: number; entries: Entry[] }
  >()
  for (const e of entries ?? []) {
    const proj = e.projects as { name: string; color: string } | null
    if (!proj) continue
    if (!byProject.has(e.project_id)) {
      byProject.set(e.project_id, { name: proj.name, color: proj.color, secs: 0, entries: [] })
    }
    const g = byProject.get(e.project_id)!
    g.secs += e.duration_seconds ?? 0
    g.entries.push(e)
  }
  const projectGroups = Array.from(byProject.entries()).sort((a, b) => b[1].secs - a[1].secs)
  const totalSecs = projectGroups.reduce((s, [, g]) => s + g.secs, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proyectos y tareas</h1>
          <p className="mt-0.5 text-sm text-gray-500">Tiempo registrado por proyecto</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${days === d ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {d}d
              </button>
            ))}
          </div>
          {projects && projects.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLog(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Registrar tiempo
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!loadingProjects && (!projects || projects.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-5">
            <Clock className="h-10 w-10 text-gray-300" />
          </div>
          <p className="text-base font-semibold text-gray-600">Sin proyectos configurados</p>
          <p className="mt-2 max-w-sm text-sm text-gray-400">
            El administrador debe crear proyectos antes de que puedas registrar tiempo.
          </p>
        </div>
      )}

      {/* Project breakdown */}
      {totalSecs > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Distribución por proyecto</h3>
          <div className="space-y-3">
            {projectGroups.map(([, g]) => {
              const pct = totalSecs > 0 ? Math.round((g.secs / totalSecs) * 100) : 0
              return (
                <div key={g.name}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="font-medium text-gray-700">{g.name}</span>
                    </div>
                    <span className="text-gray-500">
                      {fmtHours(g.secs)} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: g.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Total: {fmtHours(totalSecs)} en {days} días
          </p>
        </div>
      )}

      {/* Entries list */}
      {loadingEntries ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-50">
            {entries.map((e) => {
              const proj = e.projects as { name: string; color: string } | null
              const task = e.project_tasks as { name: string } | null
              return (
                <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: proj?.color ?? '#94a3b8' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{proj?.name ?? '—'}</p>
                    {task && <p className="text-xs text-gray-500">{task.name}</p>}
                    {e.notes && <p className="truncate text-xs italic text-gray-400">{e.notes}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-gray-900">
                      {e.duration_seconds ? fmtHours(e.duration_seconds) : '—'}
                    </p>
                    <p className="text-[11px] text-gray-400">{fmtDateTime(e.started_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-400">Sin registros en los últimos {days} días</p>
          <button
            type="button"
            onClick={() => setShowLog(true)}
            className="mt-3 text-sm font-medium text-blue-600 hover:underline"
          >
            Registrar tiempo ahora
          </button>
        </div>
      ) : null}

      {showLog && projects && (
        <LogTimeModal
          projects={projects}
          onClose={() => setShowLog(false)}
          onSaved={() => setShowLog(false)}
        />
      )}
    </div>
  )
}
