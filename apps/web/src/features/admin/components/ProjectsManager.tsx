'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, ChevronRight, Pencil, Trash2, X, ChevronDown } from 'lucide-react'

type Project = {
  id: string
  name: string
  description: string | null
  color: string | null
  is_active: boolean | null
  created_at?: string | null
  created_by?: string | null
  updated_at?: string | null
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

function ProjectForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<Project>
  onSave: (d: { name: string; description?: string; color: string }) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? '#3b82f6')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ name, description: description || undefined, color })
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="proj-name" className="text-xs font-medium text-gray-700">
          Nombre del proyecto
        </label>
        <input
          id="proj-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          placeholder="Ej: Desarrollo App Móvil"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="proj-desc" className="text-xs font-medium text-gray-700">
          Descripción (opcional)
        </label>
        <textarea
          id="proj-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700">Color</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'scale-110 ring-2 ring-blue-600 ring-offset-2' : ''}`}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || !name}
          className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function TasksSection({ project }: { project: Project }) {
  const utils = trpc.useUtils()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [taskName, setTaskName] = useState('')

  const { data: tasks } = trpc.admin.listProjectTasks.useQuery(
    { project_id: project.id },
    { enabled: open },
  )

  const createTask = trpc.admin.createProjectTask.useMutation({
    onSuccess: () => {
      void utils.admin.listProjectTasks.invalidate()
      setAdding(false)
      setTaskName('')
    },
  })
  const toggleTask = trpc.admin.updateProjectTask.useMutation({
    onSuccess: () => void utils.admin.listProjectTasks.invalidate(),
  })

  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        Tareas del proyecto
      </button>
      {open && (
        <div className="px-4 pb-3">
          {tasks?.map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                checked={t.is_active ?? false}
                id={`task-${t.id}`}
                onChange={() => toggleTask.mutate({ id: t.id, is_active: !(t.is_active ?? true) })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label
                htmlFor={`task-${t.id}`}
                className={`text-sm ${t.is_active ? 'text-gray-700' : 'text-gray-400 line-through'}`}
              >
                {t.name}
              </label>
            </div>
          ))}
          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (taskName) createTask.mutate({ project_id: project.id, name: taskName })
              }}
              className="mt-2 flex gap-2"
            >
              <input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Nombre de la tarea"
                maxLength={100}
                autoFocus
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!taskName || createTask.isPending}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Agregar
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Nueva tarea
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, onEdit }: { project: Project; onEdit: () => void }) {
  const utils = trpc.useUtils()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteProject = trpc.admin.deleteProject.useMutation({
    onSuccess: () => void utils.admin.listProjects.invalidate(),
  })
  const toggleActive = trpc.admin.updateProject.useMutation({
    onSuccess: () => void utils.admin.listProjects.invalidate(),
  })

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm ${project.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className="mt-0.5 h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: project.color ?? '#3b82f6' }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-800">{project.name}</p>
            {!project.is_active && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                Inactivo
              </span>
            )}
          </div>
          {project.description && (
            <p className="mt-0.5 truncate text-xs text-gray-500">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Editar"
            onClick={onEdit}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            title={project.is_active ? 'Desactivar' : 'Activar'}
            onClick={() => toggleActive.mutate({ id: project.id, is_active: !project.is_active })}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${project.is_active ? 'rotate-90' : ''}`}
            />
          </button>
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={() => deleteProject.mutate({ id: project.id })}
                disabled={deleteProject.isPending}
                className="rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                No
              </button>
            </>
          ) : (
            <button
              type="button"
              title="Eliminar proyecto"
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <TasksSection project={project} />
    </div>
  )
}

export function ProjectsManager() {
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: projects, isLoading } = trpc.admin.listProjects.useQuery()

  const createProject = trpc.admin.createProject.useMutation({
    onSuccess: () => {
      void utils.admin.listProjects.invalidate()
      setShowCreate(false)
    },
  })
  const updateProject = trpc.admin.updateProject.useMutation({
    onSuccess: () => {
      void utils.admin.listProjects.invalidate()
      setEditingId(null)
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proyectos</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Gestiona proyectos y tareas para el seguimiento de tiempo
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Nuevo proyecto</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <ProjectForm
                onSave={(d) => createProject.mutate(d)}
                onCancel={() => setShowCreate(false)}
                isPending={createProject.isPending}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Editar proyecto</h3>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setEditingId(null)}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <ProjectForm
                initial={projects?.find((p) => p.id === editingId)}
                onSave={(d) => updateProject.mutate({ id: editingId, ...d })}
                onCancel={() => setEditingId(null)}
                isPending={updateProject.isPending}
              />
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && (!projects || projects.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center">
          <p className="text-base font-semibold text-gray-600">Sin proyectos</p>
          <p className="mt-2 text-sm text-gray-400">
            Crea el primer proyecto para que los empleados puedan registrar tiempo.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Crear proyecto
          </button>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onEdit={() => setEditingId(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
