'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Archive,
  ArchiveRestore,
  MoreVertical,
  Pencil,
  Plug,
  FileBarChart,
  Download,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { iniciales } from './panel-identidad'
import {
  ProjectModal,
  TaskModal,
  PRIORIDADES,
  ESTADOS,
  type ProyectoEditable,
  type TareaEditable,
} from './ProjectModals'
import { downloadXlsx } from '@/lib/xlsx'

/**
 * Proyectos y tareas: lista, búsqueda, filtro por estado, selección masiva
 * (archivar, restaurar, eliminar), progreso y origen. Archivar no borra: el
 * tiempo registrado sobre un proyecto cerrado sigue existiendo para nómina.
 */

type Pestana = 'proyectos' | 'tareas'

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function Avatar({ nombre }: { nombre: string | null }) {
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700"
      title={nombre ?? 'Sin asignar'}
    >
      {nombre ? iniciales(nombre) : '?'}
    </span>
  )
}

function Progreso({ hechas, total }: { hechas: number; total: number }) {
  const pct = total > 0 ? Math.round((hechas / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500">
        {hechas}/{total}
      </span>
    </div>
  )
}

const INTEGRACION_NOMBRE: Record<string, string> = {
  jira: 'Jira',
  asana: 'Asana',
  trello: 'Trello',
  gitlab: 'GitLab',
  zapier: 'Zapier',
}

export function ProjectsManager() {
  const utils = trpc.useUtils()
  const [pestana, setPestana] = useState<Pestana>('proyectos')
  const [busqueda, setBusqueda] = useState('')
  const [archivados, setArchivados] = useState(false)
  const [filtroAbierto, setFiltroAbierto] = useState(false)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<string | null>(null)
  const [modalProyecto, setModalProyecto] = useState<ProyectoEditable | 'nuevo' | null>(null)
  const [modalTarea, setModalTarea] = useState<
    TareaEditable | { nueva: true; project_id?: string } | null
  >(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const filtro = { archived: archivados, ...(busqueda.trim() ? { search: busqueda.trim() } : {}) }
  const proyectos = trpc.admin.listProjects.useQuery(filtro)
  const tareas = trpc.admin.listProjectTasks.useQuery(filtro)
  const todosLosProyectos = trpc.admin.listProjects.useQuery({ archived: false })

  const refrescar = () => {
    void utils.admin.listProjects.invalidate()
    void utils.admin.listProjectTasks.invalidate()
    setSeleccion(new Set())
  }
  const archivarProyectos = trpc.admin.setProjectsArchived.useMutation({ onSuccess: refrescar })
  const borrarProyectos = trpc.admin.deleteProjects.useMutation({ onSuccess: refrescar })
  const archivarTareas = trpc.admin.setTasksArchived.useMutation({ onSuccess: refrescar })
  const borrarTareas = trpc.admin.deleteTasks.useMutation({ onSuccess: refrescar })
  const actualizarTarea = trpc.admin.updateProjectTask.useMutation({ onSuccess: refrescar })

  const filas: { id: string }[] =
    pestana === 'proyectos' ? (proyectos.data ?? []) : (tareas.data ?? [])
  const todasSeleccionadas = filas.length > 0 && filas.every((f) => seleccion.has(f.id))

  function alternar(id: string) {
    setSeleccion((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function seleccionarTodo() {
    setSeleccion(todasSeleccionadas ? new Set() : new Set(filas.map((f) => f.id)))
  }
  function cambiarPestana(p: Pestana) {
    setPestana(p)
    setSeleccion(new Set())
    setMenu(null)
  }

  const ids = [...seleccion]
  function accionMasiva(accion: 'archivar' | 'restaurar' | 'eliminar') {
    if (!ids.length) return
    if (accion === 'eliminar') {
      const que = pestana === 'proyectos' ? 'proyecto(s) y sus tareas' : 'tarea(s)'
      if (!window.confirm(`¿Eliminar ${ids.length} ${que}? Esta acción no se puede deshacer.`))
        return
      if (pestana === 'proyectos') borrarProyectos.mutate({ ids })
      else borrarTareas.mutate({ ids })
      return
    }
    const archived = accion === 'archivar'
    if (pestana === 'proyectos') archivarProyectos.mutate({ ids, archived })
    else archivarTareas.mutate({ ids, archived })
  }

  function exportar() {
    if (pestana === 'proyectos') {
      const rows = (proyectos.data ?? []).map((p) => [
        p.name,
        p.is_active ? 'Activo' : 'Inactivo',
        p.visibility === 'limited' ? 'Limitada' : 'Todos',
        fecha(p.created_at),
        p.created_by_name ?? '',
        p.integration ? (INTEGRACION_NOMBRE[p.integration] ?? p.integration) : 'BCWork',
        p.tasks_done,
        p.tasks_total,
      ])
      downloadXlsx(
        [
          {
            name: 'Proyectos',
            header: [
              'Nombre',
              'Estado',
              'Visibilidad',
              'Creado',
              'Creado por',
              'Origen',
              'Tareas hechas',
              'Tareas',
            ],
            rows,
          },
        ],
        `bcwork-proyectos-${new Date().toISOString().slice(0, 10)}`,
      )
    } else {
      const rows = (tareas.data ?? []).map((t) => [
        t.name,
        t.project_name,
        t.created_by_name ?? '',
        t.assignee_name ?? '',
        t.tag ?? '',
        ESTADOS.find((e) => e.v === t.status)?.l ?? t.status,
        PRIORIDADES.find((p) => p.v === t.priority)?.l ?? t.priority,
        t.due_date ?? '',
      ])
      downloadXlsx(
        [
          {
            name: 'Tareas',
            header: [
              'Tarea',
              'Proyecto',
              'Creado por',
              'Asignada a',
              'Etiqueta',
              'Progreso',
              'Urgencia',
              'Vence',
            ],
            rows,
          },
        ],
        `bcwork-tareas-${new Date().toISOString().slice(0, 10)}`,
      )
    }
  }

  const cargando = pestana === 'proyectos' ? proyectos.isLoading : tareas.isLoading
  const th = 'px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400'

  return (
    <div className="space-y-4" onClick={() => menu && setMenu(null)}>
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {pestana === 'proyectos' ? 'Lista de proyectos' : 'Lista de tareas'}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Organizá el trabajo y medí el tiempo que se le dedica
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/integrations"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Plug className="h-4 w-4" /> Integraciones
          </Link>
          <Link
            href="/admin/report-builder"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <FileBarChart className="h-4 w-4" /> Informes
          </Link>
          <button
            type="button"
            onClick={exportar}
            disabled={filas.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button
            type="button"
            onClick={() =>
              pestana === 'proyectos' ? setModalProyecto('nuevo') : setModalTarea({ nueva: true })
            }
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {pestana === 'proyectos' ? 'Nuevo proyecto' : 'Nueva tarea'}
          </button>
        </div>
      </div>

      {/* Pestañas + búsqueda + filtro */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(
            [
              ['proyectos', 'Proyectos'],
              ['tareas', 'Tareas'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => cambiarPestana(v)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                pestana === v
                  ? 'bg-white font-medium text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={pestana === 'proyectos' ? 'Buscar proyectos' : 'Buscar tareas'}
            className="w-64 rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setFiltroAbierto((v) => !v)
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" /> Filtrar
            <span className="rounded bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
              1
            </span>
          </button>
          {filtroAbierto && (
            <div
              className="absolute left-0 top-11 z-20 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Estado
              </p>
              {[
                [false, 'Activos'],
                [true, 'Archivados'],
              ].map(([v, l]) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => {
                    setArchivados(v as boolean)
                    setFiltroAbierto(false)
                    setSeleccion(new Set())
                  }}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    archivados === v ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {l as string}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {aviso && <p className="text-xs text-blue-700">{aviso}</p>}

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between bg-gray-800 px-4 py-2.5 text-sm text-white">
          <button
            type="button"
            onClick={seleccionarTodo}
            className="font-medium underline-offset-2 hover:underline"
          >
            {todasSeleccionadas ? 'Quitar selección' : 'Seleccionar todo'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-gray-300">
              <span className="font-semibold text-blue-300">{seleccion.size}</span>{' '}
              {pestana === 'proyectos' ? 'proyectos' : 'tareas'} seleccionados
            </span>
            <button
              type="button"
              onClick={() => accionMasiva('eliminar')}
              disabled={!seleccion.size}
              title="Eliminar"
              className="rounded p-1 hover:bg-gray-700 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => accionMasiva('archivar')}
              disabled={!seleccion.size || archivados}
              title="Archivar"
              className="rounded p-1 hover:bg-gray-700 disabled:opacity-30"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => accionMasiva('restaurar')}
              disabled={!seleccion.size || !archivados}
              title="Restaurar"
              className="rounded p-1 hover:bg-gray-700 disabled:opacity-30"
            >
              <ArchiveRestore className="h-4 w-4" />
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="space-y-2 p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : filas.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-gray-400">
            {archivados
              ? 'Nada archivado.'
              : busqueda
                ? 'Sin resultados.'
                : pestana === 'proyectos'
                  ? 'Todavía no hay proyectos. Creá el primero.'
                  : 'Todavía no hay tareas.'}
          </p>
        ) : pestana === 'proyectos' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-10 px-4 py-3" />
                  <th className={th}>Nombre de proyecto</th>
                  <th className={th}>Creado</th>
                  <th className={th}>Creado por</th>
                  <th className={th}>Integración</th>
                  <th className={th}>Progreso</th>
                  <th className={th}>Estado</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(proyectos.data ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={seleccion.has(p.id)}
                        onChange={() => alternar(p.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setModalProyecto(p)}
                        className="flex items-center gap-2 font-medium text-gray-800 hover:text-blue-700"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-sm"
                          style={{ background: p.color ?? '#2563eb' }}
                        />
                        {p.name}
                      </button>
                      {p.visibility === 'limited' && (
                        <span className="ml-5 text-[11px] text-gray-400">
                          visibilidad limitada · {p.member_ids.length} personas
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fecha(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <Avatar nombre={p.created_by_name} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.integration ? (
                        (INTEGRACION_NOMBRE[p.integration] ?? p.integration)
                      ) : (
                        <span className="text-gray-400">BCWork</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Progreso hechas={p.tasks_done} total={p.tasks_total} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="relative px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenu(menu === p.id ? null : p.id)
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        title="Acciones"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menu === p.id && (
                        <div
                          className="absolute right-4 top-10 z-20 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setModalProyecto(p)
                              setMenu(null)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPestana('tareas')
                              setBusqueda('')
                              setModalTarea({ nueva: true, project_id: p.id })
                              setMenu(null)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Plus className="h-3.5 w-3.5" /> Nueva tarea
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              archivados
                                ? archivarProyectos.mutate({ ids: [p.id], archived: false })
                                : archivarProyectos.mutate({ ids: [p.id], archived: true })
                              setMenu(null)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {archivados ? (
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            ) : (
                              <Archive className="h-3.5 w-3.5" />
                            )}{' '}
                            {archivados ? 'Restaurar' : 'Archivar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar "${p.name}" y sus tareas?`))
                                borrarProyectos.mutate({ ids: [p.id] })
                              setMenu(null)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-10 px-4 py-3" />
                  <th className={th}>Nombre de la tarea</th>
                  <th className={th}>Proyecto</th>
                  <th className={th}>Creado por</th>
                  <th className={th}>Persona asignada</th>
                  <th className={th}>Etiqueta</th>
                  <th className={th}>Progreso</th>
                  <th className={th}>Urgencia</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(tareas.data ?? []).map((t) => {
                  const estado = ESTADOS.find((e) => e.v === t.status) ?? ESTADOS[0]
                  const prio = PRIORIDADES.find((p) => p.v === t.priority) ?? PRIORIDADES[1]
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={seleccion.has(t.id)}
                          onChange={() => alternar(t.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setModalTarea(t)}
                          className="font-medium text-gray-800 hover:text-blue-700"
                        >
                          {t.name}
                        </button>
                        {t.due_date && (
                          <span className="ml-2 text-[11px] text-gray-400">vence {t.due_date}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.project_name}</td>
                      <td className="px-4 py-3">
                        <Avatar nombre={t.created_by_name} />
                      </td>
                      <td className="px-4 py-3">
                        <Avatar nombre={t.assignee_name} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {t.tag ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                            {t.tag}
                          </span>
                        ) : (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={t.status}
                          onChange={(e) =>
                            actualizarTarea.mutate({
                              id: t.id,
                              status: e.target.value as 'todo' | 'in_progress' | 'done',
                            })
                          }
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                          title="Progreso"
                        >
                          {ESTADOS.map((s) => (
                            <option key={s.v} value={s.v}>
                              {s.l} · {s.pct}%
                            </option>
                          ))}
                        </select>
                        <span className="sr-only">{estado.l}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-sm ${prio.c}`}>
                          <span className="inline-block h-2 w-2 rounded-full border-2 border-current" />
                          {prio.l}
                        </span>
                      </td>
                      <td className="relative px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenu(menu === t.id ? null : t.id)
                          }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Acciones"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menu === t.id && (
                          <div
                            className="absolute right-4 top-10 z-20 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setModalTarea(t)
                                setMenu(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                archivarTareas.mutate({ ids: [t.id], archived: !archivados })
                                setMenu(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              {archivados ? (
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}{' '}
                              {archivados ? 'Restaurar' : 'Archivar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar "${t.name}"?`))
                                  borrarTareas.mutate({ ids: [t.id] })
                                setMenu(null)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalProyecto && (
        <ProjectModal
          existente={modalProyecto === 'nuevo' ? undefined : modalProyecto}
          onClose={() => {
            setModalProyecto(null)
            setAviso(null)
          }}
        />
      )}
      {modalTarea && (
        <TaskModal
          existente={'nueva' in modalTarea ? undefined : modalTarea}
          proyectoInicial={'nueva' in modalTarea ? modalTarea.project_id : undefined}
          proyectos={(todosLosProyectos.data ?? []).map((p) => ({ id: p.id, name: p.name }))}
          onClose={() => setModalTarea(null)}
        />
      )}
    </div>
  )
}
