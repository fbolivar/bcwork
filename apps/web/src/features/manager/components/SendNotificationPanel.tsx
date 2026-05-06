'use client'

import { useState, useMemo } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Bell, CheckCircle2, Users, User } from 'lucide-react'

export function SendNotificationPanel() {
  const { data: members, isLoading } = trpc.notifications.getTenantMembers.useQuery()

  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)

  const send = trpc.notifications.sendNotification.useMutation({
    onSuccess: () => {
      setSent(true)
      setSelectedIds([])
      setTitle('')
      setBody('')
      setTimeout(() => setSent(false), 4000)
    },
  })

  const departments = useMemo(() => {
    const depts = [...new Set((members ?? []).map((m) => m.department).filter(Boolean))] as string[]
    return depts.sort()
  }, [members])

  const visibleMembers = useMemo(
    () => (members ?? []).filter((m) => deptFilter === 'all' || m.department === deptFilter),
    [members, deptFilter],
  )

  function toggleAll() {
    const visibleIds = visibleMembers.map((m) => m.id)
    const allSelected = visibleIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])])
    }
  }

  function toggleMember(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function selectDept(dept: string) {
    setDeptFilter(dept)
  }

  const visibleSelected = visibleMembers.filter((m) => selectedIds.includes(m.id)).length
  const allVisibleSelected = visibleMembers.length > 0 && visibleSelected === visibleMembers.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Enviar notificación</h1>
        <p className="mt-1 text-sm text-gray-500">
          Los empleados la recibirán en su campana de notificaciones
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Destinatarios */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">Destinatarios</h2>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:underline"
            >
              {allVisibleSelected ? 'Deseleccionar' : 'Seleccionar todos'}
            </button>
          </div>

          {/* Filtro por departamento */}
          {departments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => selectDept('all')}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  deptFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                Todos
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => selectDept(dept)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    deptFilter === dept
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : visibleMembers.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin empleados en este filtro</p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {visibleMembers.map((m) => {
                const selected = selectedIds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {selected && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                          <path
                            d="M10 3L5 8.5 2 5.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            fill="none"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {m.full_name ?? m.email}
                      </p>
                      {m.department && (
                        <p className="truncate text-xs text-gray-400">{m.department}</p>
                      )}
                    </div>
                    <User className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  </button>
                )
              })}
            </div>
          )}

          {selectedIds.length > 0 && (
            <p className="mt-2 text-xs text-blue-600">
              {selectedIds.length} destinatario{selectedIds.length > 1 ? 's' : ''} seleccionado
              {selectedIds.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Redactar mensaje */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Mensaje</h2>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (selectedIds.length === 0) return
              send.mutate({ userIds: selectedIds, title, body: body || undefined })
            }}
          >
            <div>
              <label htmlFor="notif-title" className="mb-1 block text-xs font-medium text-gray-600">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                id="notif-title"
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Reunión de equipo mañana a las 10am"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="notif-body" className="mb-1 block text-xs font-medium text-gray-600">
                Detalle <span className="text-gray-400">(opcional)</span>
              </label>
              <textarea
                id="notif-body"
                maxLength={1000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Información adicional para el empleado..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Vista previa */}
            {title && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="mb-1 text-xs font-medium text-blue-600">Vista previa</p>
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                {body && <p className="mt-0.5 text-xs text-gray-600">{body}</p>}
                {selectedIds.length > 0 && (
                  <p className="mt-1.5 text-xs text-blue-500">
                    → {selectedIds.length} destinatario{selectedIds.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {send.error && <p className="text-sm text-red-600">{send.error.message}</p>}

            {sent && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Notificación enviada correctamente
              </div>
            )}

            <button
              type="submit"
              disabled={send.isPending || selectedIds.length === 0 || !title.trim()}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {send.isPending
                ? 'Enviando...'
                : selectedIds.length === 0
                  ? 'Selecciona al menos un destinatario'
                  : `Enviar a ${selectedIds.length} persona${selectedIds.length > 1 ? 's' : ''}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
