'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { BookOpen, CheckCircle2, Clock, UserPlus } from 'lucide-react'

function fmtDuration(mins: number | null) {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function TeamTrainingPanel() {
  const utils = trpc.useUtils()
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id

  const { data, isLoading } = trpc.manager.getTeamTrainingProgress.useQuery(
    { teamId },
    { enabled: true },
  )

  const enroll = trpc.manager.enrollInCourse.useMutation({
    onSuccess: () => utils.manager.getTeamTrainingProgress.invalidate(),
  })

  const courses = (data?.courses ?? []) as any[]
  const employees = (data?.employees ?? []) as any[]

  const activeCourse = courses.find((c) => c.id === selectedCourse)

  function getEnrollment(empId: string, courseId: string) {
    const emp = employees.find((e: any) => e.id === empId)
    return emp?.enrollments?.find((en: any) => en.course_id === courseId)
  }

  const CATEGORY_COLORS: Record<string, string> = {
    general: 'bg-gray-100 text-gray-600',
    technical: 'bg-blue-100 text-blue-700',
    leadership: 'bg-purple-100 text-purple-700',
    compliance: 'bg-red-100 text-red-600',
    soft_skills: 'bg-green-100 text-green-700',
    security: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Capacitaciones</h2>
        <p className="mt-0.5 text-sm text-gray-500">Seguimiento de cursos y progreso del equipo</p>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-10 rounded-xl bg-gray-100" />
          <div className="h-48 rounded-xl bg-gray-100" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No hay cursos disponibles</p>
          <p className="mt-1 text-xs text-gray-400">
            El administrador puede crear cursos en el panel de admin
          </p>
        </div>
      ) : (
        <>
          {/* Course tabs */}
          <div className="flex flex-wrap gap-2">
            {courses.map((c: any) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCourse(selectedCourse === c.id ? null : c.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCourse === c.id
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {c.is_required && <span className="text-[10px]">★</span>}
                {c.title}
              </button>
            ))}
          </div>

          {/* Summary grid */}
          {!selectedCourse && (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Empleado</th>
                    {courses.slice(0, 5).map((c: any) => (
                      <th
                        key={c.id}
                        className="max-w-[80px] truncate px-2 py-2.5 text-center font-medium"
                        title={c.title}
                      >
                        {c.title.length > 12 ? c.title.slice(0, 10) + '…' : c.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {employees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-medium text-gray-800">
                          {emp.full_name ?? emp.email}
                        </p>
                      </td>
                      {courses.slice(0, 5).map((c: any) => {
                        const en = getEnrollment(emp.id, c.id)
                        return (
                          <td key={c.id} className="px-2 py-2.5 text-center">
                            {en ? (
                              en.status === 'completed' ? (
                                <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="h-1.5 w-12 rounded-full bg-gray-100">
                                    <div
                                      className="h-1.5 rounded-full bg-blue-500"
                                      style={{ width: `${en.progress_pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-gray-400">
                                    {en.progress_pct}%
                                  </span>
                                </div>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  enroll.mutate({ employee_id: emp.id, course_id: c.id })
                                }
                                disabled={enroll.isPending}
                                title="Asignar curso"
                                className="mx-auto flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-300 hover:border-blue-400 hover:text-blue-500"
                              >
                                <UserPlus className="h-3 w-3" />
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Course detail */}
          {selectedCourse && activeCourse && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{activeCourse.title}</p>
                    {activeCourse.description && (
                      <p className="mt-0.5 text-xs text-gray-500">{activeCourse.description}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[activeCourse.category] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {activeCourse.category}
                      </span>
                      {activeCourse.duration_minutes && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock className="h-3 w-3" /> {fmtDuration(activeCourse.duration_minutes)}
                        </span>
                      )}
                      {activeCourse.is_required && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                          Obligatorio
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {employees.map((emp: any) => {
                  const en = getEnrollment(emp.id, activeCourse.id)
                  return (
                    <div
                      key={emp.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-2.5"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                        {(emp.full_name ?? emp.email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <p className="flex-1 text-sm text-gray-800">{emp.full_name ?? emp.email}</p>
                      {en ? (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-24 rounded-full bg-gray-100">
                              <div
                                className={`h-1.5 rounded-full ${en.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${en.progress_pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{en.progress_pct}%</span>
                          </div>
                          {en.status === 'completed' ? (
                            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                              <CheckCircle2 className="h-3 w-3" /> Completado
                            </span>
                          ) : (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                              En curso
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            enroll.mutate({ employee_id: emp.id, course_id: activeCourse.id })
                          }
                          disabled={enroll.isPending}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600"
                        >
                          <UserPlus className="h-3 w-3" /> Asignar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
