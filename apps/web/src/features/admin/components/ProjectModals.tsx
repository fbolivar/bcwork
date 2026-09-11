'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

/** Modales de proyecto y de tarea. */

const input =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100'
const label = 'mb-1 block text-xs font-medium text-gray-600'

export function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export interface ProyectoEditable {
  id: string
  name: string
  description: string | null
  is_active: boolean | null
  visibility: string
  member_ids: string[]
}

export function ProjectModal({
  existente,
  onClose,
}: {
  existente?: ProyectoEditable
  onClose: () => void
}) {
  const utils = trpc.useUtils()
  const { data: plantilla } = trpc.admin.listUsers.useQuery({ pageSize: 100 })
  const personas = (
    (plantilla?.data ?? []) as { id: string; full_name: string | null; email: string }[]
  ).map((u) => ({ id: u.id, nombre: u.full_name || u.email }))

  const [nombre, setNombre] = useState(existente?.name ?? '')
  const [descripcion, setDescripcion] = useState(existente?.description ?? '')
  const [activo, setActivo] = useState(existente?.is_active ?? true)
  const [visibilidad, setVisibilidad] = useState<'all' | 'limited'>(
    (existente?.visibility as 'all' | 'limited') ?? 'all',
  )
  const [miembros, setMiembros] = useState<string[]>(existente?.member_ids ?? [])
  const [error, setError] = useState('')

  const listo = () => {
    void utils.admin.listProjects.invalidate()
    onClose()
  }
  const crear = trpc.admin.createProject.useMutation({
    onSuccess: listo,
    onError: (e) => setError(e.message),
  })
  const editar = trpc.admin.updateProject.useMutation({
    onSuccess: listo,
    onError: (e) => setError(e.message),
  })
  const ocupado = crear.isPending || editar.isPending

  function guardar() {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (visibilidad === 'limited' && miembros.length === 0) {
      setError('Con visibilidad limitada hay que elegir al menos una persona.')
      return
    }
    const base = {
      name: nombre.trim(),
      description: descripcion.trim() || undefined,
      is_active: activo,
      visibility: visibilidad,
      member_ids: visibilidad === 'limited' ? miembros : [],
    }
    if (existente) editar.mutate({ id: existente.id, ...base })
    else crear.mutate(base)
  }

  return (
    <Modal titulo={existente ? 'Editar proyecto' : 'Crear un proyecto'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={label}>
            Nombre de proyecto <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de proyecto"
            className={input}
          />
        </div>
        <div>
          <label className={label}>Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Estado</label>
          <select
            value={activo ? 'active' : 'inactive'}
            onChange={(e) => setActivo(e.target.value === 'active')}
            className={input}
            title="Estado"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <p className="mt-1 text-[11px] text-gray-400">
            Un proyecto inactivo no se ofrece para registrar tiempo, pero sigue visible.
          </p>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className={label}>Visibilidad</label>
          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={visibilidad === 'all'}
                onChange={() => setVisibilidad('all')}
              />
              Visible para todos
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={visibilidad === 'limited'}
                onChange={() => setVisibilidad('limited')}
              />
              Limitar visibilidad
            </label>
          </div>
          {visibilidad === 'limited' && (
            <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {personas.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 px-1 py-0.5 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={miembros.includes(p.id)}
                    onChange={(e) =>
                      setMiembros((m) =>
                        e.target.checked ? [...m, p.id] : m.filter((x) => x !== p.id),
                      )
                    }
                  />
                  {p.nombre}
                </label>
              ))}
              {personas.length === 0 && (
                <p className="px-1 py-2 text-xs text-gray-400">No hay personas para elegir.</p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={ocupado}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {ocupado ? 'Guardando…' : existente ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export interface TareaEditable {
  id: string
  name: string
  project_id: string
  assignee_id: string | null
  tag: string | null
  priority: string
  status: string
  due_date: string | null
}

export const PRIORIDADES = [
  { v: 'low', l: 'Baja', c: 'text-gray-400' },
  { v: 'medium', l: 'Media', c: 'text-amber-500' },
  { v: 'high', l: 'Alta', c: 'text-orange-500' },
  { v: 'urgent', l: 'Urgente', c: 'text-red-600' },
] as const

export const ESTADOS = [
  { v: 'todo', l: 'Por hacer', pct: 0 },
  { v: 'in_progress', l: 'En curso', pct: 50 },
  { v: 'done', l: 'Hecha', pct: 100 },
] as const

export function TaskModal({
  existente,
  proyectoInicial,
  proyectos,
  onClose,
}: {
  existente?: TareaEditable
  proyectoInicial?: string
  proyectos: { id: string; name: string }[]
  onClose: () => void
}) {
  const utils = trpc.useUtils()
  const { data: plantilla } = trpc.admin.listUsers.useQuery({ pageSize: 100 })
  const personas = (
    (plantilla?.data ?? []) as { id: string; full_name: string | null; email: string }[]
  ).map((u) => ({ id: u.id, nombre: u.full_name || u.email }))

  const [nombre, setNombre] = useState(existente?.name ?? '')
  const [proyecto, setProyecto] = useState(
    existente?.project_id ?? proyectoInicial ?? proyectos[0]?.id ?? '',
  )
  const [responsable, setResponsable] = useState(existente?.assignee_id ?? '')
  const [etiqueta, setEtiqueta] = useState(existente?.tag ?? '')
  const [prioridad, setPrioridad] = useState(existente?.priority ?? 'medium')
  const [estado, setEstado] = useState(existente?.status ?? 'todo')
  const [vence, setVence] = useState(existente?.due_date ?? '')
  const [error, setError] = useState('')

  const listo = () => {
    void utils.admin.listProjectTasks.invalidate()
    void utils.admin.listProjects.invalidate()
    onClose()
  }
  const crear = trpc.admin.createProjectTask.useMutation({
    onSuccess: listo,
    onError: (e) => setError(e.message),
  })
  const editar = trpc.admin.updateProjectTask.useMutation({
    onSuccess: listo,
    onError: (e) => setError(e.message),
  })
  const ocupado = crear.isPending || editar.isPending

  function guardar() {
    if (!nombre.trim()) return setError('El nombre es obligatorio.')
    if (!proyecto) return setError('Elegí un proyecto.')
    const base = {
      name: nombre.trim(),
      project_id: proyecto,
      assignee_id: responsable || null,
      tag: etiqueta.trim() || null,
      priority: prioridad as 'low' | 'medium' | 'high' | 'urgent',
      status: estado as 'todo' | 'in_progress' | 'done',
      due_date: vence || null,
    }
    if (existente) editar.mutate({ id: existente.id, ...base })
    else crear.mutate(base)
  }

  return (
    <Modal titulo={existente ? 'Editar tarea' : 'Crear una tarea'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={label}>
            Nombre de la tarea <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={input}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Proyecto</label>
            <select
              value={proyecto}
              onChange={(e) => setProyecto(e.target.value)}
              className={input}
              title="Proyecto"
            >
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Persona asignada</label>
            <select
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className={input}
              title="Persona asignada"
            >
              <option value="">Sin asignar</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Etiqueta</label>
            <input
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              placeholder="diseño, cliente, urgente…"
              className={input}
            />
          </div>
          <div>
            <label className={label}>Urgencia</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className={input}
              title="Urgencia"
            >
              {PRIORIDADES.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Progreso</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className={input}
              title="Progreso"
            >
              {ESTADOS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Vence</label>
            <input
              type="date"
              value={vence}
              onChange={(e) => setVence(e.target.value)}
              className={input}
              title="Vence"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={ocupado}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {ocupado ? 'Guardando…' : existente ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
