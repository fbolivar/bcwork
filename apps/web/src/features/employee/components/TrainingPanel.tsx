'use client'

import { trpc } from '@/lib/trpc-client'
import { GraduationCap, ExternalLink, Clock, AlertCircle } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  enrolled: { label: 'Inscrito', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'En progreso', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700' },
}

export function TrainingPanel() {
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.employee.getMyTraining.useQuery()

  const updateProgress = trpc.employee.updateTrainingProgress.useMutation({
    onSuccess: () => utils.employee.getMyTraining.invalidate(),
  })

  const enrollments = data?.enrollments ?? []
  const requiredIds = new Set((data?.required_courses ?? []).map((c) => c.id))
  const enrolledIds = new Set(enrollments.map((e) => (e.training_courses as any)?.id))
  const pendingRequired = (data?.required_courses ?? []).filter((c) => !enrolledIds.has(c.id))
  const completed = enrollments.filter((e) => e.status === 'completed').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Capacitación</h1>
        <p className="mt-0.5 text-sm text-gray-500">Cursos y formación asignados por tu empresa</p>
      </div>

      {!isLoading && (
        <div className="flex gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Completados</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">{completed}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">En progreso</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">
              {enrollments.filter((e) => e.status === 'in_progress').length}
            </p>
          </div>
          {pendingRequired.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-xs text-red-600">Obligatorios pendientes</p>
              <p className="mt-0.5 text-2xl font-bold text-red-700">{pendingRequired.length}</p>
            </div>
          )}
        </div>
      )}

      {pendingRequired.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" />
            Cursos obligatorios sin iniciar
          </div>
          <ul className="mt-2 space-y-1">
            {pendingRequired.map((c) => (
              <li key={c.id} className="text-xs text-red-600">
                · {c.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <GraduationCap className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No tienes cursos asignados</p>
          <p className="mt-1 text-xs text-gray-400">Tu manager inscribirá cursos aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((e) => {
            const course = e.training_courses as any
            const st = STATUS_MAP[e.status] ?? STATUS_MAP.enrolled
            const isReq = course && requiredIds.has(course.id)
            return (
              <div key={e.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{course?.title ?? '—'}</p>
                      {isReq && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                          Obligatorio
                        </span>
                      )}
                    </div>
                    {course?.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">
                        {course.description}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      {course?.category && <span>{course.category}</span>}
                      {course?.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {course.duration_minutes} min
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st?.color ?? 'bg-gray-100 text-gray-500'}`}
                  >
                    {st?.label ?? e.status}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Progreso</span>
                    <span className="font-medium">{e.progress_pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${e.progress_pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  {course?.content_url && (
                    <a
                      href={course.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir curso
                    </a>
                  )}
                  {e.status !== 'completed' && (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={10}
                        value={e.progress_pct}
                        onChange={(ev) =>
                          updateProgress.mutate({
                            enrollment_id: e.id,
                            progress_pct: Number(ev.target.value),
                          })
                        }
                        className="flex-1 accent-blue-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
