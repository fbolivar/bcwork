'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  GraduationCap,
  Plus,
  X,
  Trash2,
  UserPlus,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const ENROLLMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  enrolled: { label: 'Inscrito', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En progreso', color: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700' },
  dropped: { label: 'Abandonó', color: 'bg-gray-100 text-gray-500' },
}

function EnrollmentsPanel({ courseId }: { courseId: string }) {
  const { data: enrollments, isLoading } = trpc.admin.getTrainingEnrollments.useQuery({
    course_id: courseId,
  })
  const all = (enrollments ?? []) as any[]

  if (isLoading) return <div className="mt-2 h-10 animate-pulse rounded bg-gray-100" />
  if (all.length === 0)
    return <p className="mt-2 text-xs text-gray-400">Sin inscripciones todavía.</p>

  return (
    <div className="mt-2 space-y-1.5">
      {all.map((e: any) => {
        const st = ENROLLMENT_STATUS_LABELS[e.status] ?? ENROLLMENT_STATUS_LABELS.enrolled
        return (
          <div key={e.id} className="flex items-center gap-2 text-xs">
            <span className="flex-1 text-gray-700">{e.users?.full_name ?? e.employee_id}</span>
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${st?.color ?? 'bg-gray-100 text-gray-500'}`}
            >
              {st?.label ?? e.status}
            </span>
            {e.progress != null && <span className="text-gray-400">{e.progress}%</span>}
          </div>
        )
      })}
    </div>
  )
}

export function TrainingManager() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [showEnroll, setShowEnroll] = useState<string | null>(null)
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)
  const [enrollUserId, setEnrollUserId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [category, setCategory] = useState('general')
  const [duration, setDuration] = useState('')
  const [isRequired, setIsRequired] = useState(false)

  const { data: courses, isLoading } = trpc.admin.listTrainingCourses.useQuery()
  const { data: usersData } = trpc.admin.listUsers.useQuery({ pageSize: 100 })

  const create = trpc.admin.createTrainingCourse.useMutation({
    onSuccess: () => {
      utils.admin.listTrainingCourses.invalidate()
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setContentUrl('')
      setDuration('')
      setIsRequired(false)
    },
  })

  const remove = trpc.admin.deleteTrainingCourse.useMutation({
    onSuccess: () => utils.admin.listTrainingCourses.invalidate(),
  })

  const enroll = trpc.admin.enrollEmployeeInCourse.useMutation({
    onSuccess: () => {
      utils.admin.listTrainingCourses.invalidate()
      utils.admin.getTrainingEnrollments.invalidate()
      setShowEnroll(null)
      setEnrollUserId('')
    },
  })

  const allCourses = (courses ?? []) as any[]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Capacitación</h2>
          <p className="mt-0.5 text-sm text-gray-500">Gestiona cursos y formación del equipo</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo curso
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : allCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No hay cursos creados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allCourses.map((c: any) => (
            <div key={c.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                    {c.is_required && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                        Obligatorio
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{c.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span>{c.category}</span>
                    {c.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {c.duration_minutes} min
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Ver inscripciones"
                    onClick={() => setExpandedCourse(expandedCourse === c.id ? null : c.id)}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  >
                    {expandedCourse === c.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Inscribir empleado"
                    onClick={() => {
                      setShowEnroll(c.id)
                      setEnrollUserId('')
                    }}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Eliminar"
                    onClick={() => remove.mutate({ id: c.id })}
                    disabled={remove.isPending}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {expandedCourse === c.id && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-600">Inscripciones</p>
                  <EnrollmentsPanel courseId={c.id} />
                </div>
              )}

              {showEnroll === c.id && (
                <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                  <select
                    title="Seleccionar empleado"
                    value={enrollUserId}
                    onChange={(e) => setEnrollUserId(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none"
                  >
                    <option value="">Seleccionar empleado...</option>
                    {(usersData?.data ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowEnroll(null)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!enrollUserId || enroll.isPending}
                    onClick={() => enroll.mutate({ course_id: c.id, employee_id: enrollUserId })}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Inscribir
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Nuevo curso</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="tr-title" className="text-xs font-medium text-gray-700">
                  Título
                </label>
                <input
                  id="tr-title"
                  type="text"
                  placeholder="Ej: Inducción corporativa"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="tr-desc" className="text-xs font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  id="tr-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="tr-url" className="text-xs font-medium text-gray-700">
                  URL del contenido
                </label>
                <input
                  id="tr-url"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tr-cat" className="text-xs font-medium text-gray-700">
                    Categoría
                  </label>
                  <input
                    id="tr-cat"
                    type="text"
                    placeholder="general"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="tr-dur" className="text-xs font-medium text-gray-700">
                    Duración (min)
                  </label>
                  <input
                    id="tr-dur"
                    type="number"
                    min="1"
                    placeholder="60"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                Curso obligatorio para todos
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!title.trim() || create.isPending}
                onClick={() =>
                  create.mutate({
                    title,
                    description: description || undefined,
                    content_url: contentUrl || undefined,
                    category,
                    duration_minutes: duration ? Number(duration) : undefined,
                    is_required: isRequired,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Crear curso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
