'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Pin,
  AlertTriangle,
  Sparkles,
  Info,
  Wrench,
  X,
  Check,
} from 'lucide-react'

const TYPE_CONFIG = {
  info: { label: 'Info', icon: Info, color: 'text-blue-600 bg-blue-50' },
  warning: { label: 'Aviso', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  feature: { label: 'Novedad', icon: Sparkles, color: 'text-violet-600 bg-violet-50' },
  maintenance: { label: 'Mantenimiento', icon: Wrench, color: 'text-gray-600 bg-gray-100' },
} as const

type AnnType = keyof typeof TYPE_CONFIG

const EMPTY_FORM = {
  title: '',
  body: '',
  type: 'info' as AnnType,
  ctaLabel: '',
  ctaUrl: '',
  targetAll: true,
  targetPlans: [] as string[],
  targetTags: [] as string[],
  pinned: false,
  expiresAt: '',
  publishNow: false,
}

export function AnnouncementsManager() {
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saved, setSaved] = useState(false)

  const { data: announcements, isLoading } = trpc.platform.getAdminAnnouncements.useQuery()

  const create = trpc.platform.createAnnouncement.useMutation({
    onSuccess: () => {
      utils.platform.getAdminAnnouncements.invalidate()
      setShowForm(false)
      setForm(EMPTY_FORM)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const update = trpc.platform.updateAnnouncement.useMutation({
    onSuccess: () => {
      utils.platform.getAdminAnnouncements.invalidate()
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
    },
  })

  const del = trpc.platform.deleteAnnouncement.useMutation({
    onSuccess: () => utils.platform.getAdminAnnouncements.invalidate(),
  })

  const togglePublish = trpc.platform.updateAnnouncement.useMutation({
    onSuccess: () => utils.platform.getAdminAnnouncements.invalidate(),
  })

  function openEdit(ann: NonNullable<typeof announcements>[number]) {
    setEditId(ann.id)
    setForm({
      title: ann.title,
      body: ann.body,
      type: ann.type as AnnType,
      ctaLabel: ann.cta_label ?? '',
      ctaUrl: ann.cta_url ?? '',
      targetAll: ann.target_all,
      targetPlans: (ann.target_plans as string[]) ?? [],
      targetTags: (ann.target_tags as string[]) ?? [],
      pinned: ann.pinned,
      expiresAt: ann.expires_at ? ann.expires_at.slice(0, 16) : '',
      publishNow: ann.is_published,
    })
    setShowForm(true)
  }

  function handleSubmit() {
    const payload = {
      ...form,
      ctaLabel: form.ctaLabel || undefined,
      ctaUrl: form.ctaUrl || undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    }
    if (editId) {
      update.mutate({
        id: editId,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        ctaLabel: payload.ctaLabel ?? null,
        ctaUrl: payload.ctaUrl ?? null,
        pinned: payload.pinned,
        expiresAt: payload.expiresAt ?? null,
        isPublished: payload.publishNow,
      })
    } else {
      create.mutate(payload)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Anuncios y Changelog</h2>
          <p className="text-sm text-gray-400">
            Mensajes que aparecen en los dashboards de las empresas
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditId(null)
            setForm(EMPTY_FORM)
            setShowForm(true)
          }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo anuncio
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
          <Check className="h-4 w-4" /> Anuncio guardado exitosamente
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {editId ? 'Editar anuncio' : 'Nuevo anuncio'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditId(null)
              }}
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Tipo */}
            <div className="flex gap-2">
              {(Object.keys(TYPE_CONFIG) as AnnType[]).map((t) => {
                const cfg = TYPE_CONFIG[t]
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${form.type === t ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <cfg.icon className="h-3 w-3" />
                    {cfg.label}
                  </button>
                )
              })}
            </div>

            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Título del anuncio"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Cuerpo del anuncio (soporta markdown básico)"
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.ctaLabel}
                onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                placeholder="Texto del botón CTA (opcional)"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={form.ctaUrl}
                onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                placeholder="URL del CTA (opcional)"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
                  className="rounded"
                />
                Fijar al tope
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.publishNow}
                  onChange={(e) => setForm((f) => ({ ...f, publishNow: e.target.checked }))}
                  className="rounded"
                />
                Publicar ahora
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditId(null)
                }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  !form.title.trim() || !form.body.trim() || create.isPending || update.isPending
                }
                onClick={handleSubmit}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {editId ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (announcements ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-400">Sin anuncios. Crea el primero.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(announcements ?? []).map((ann) => {
            const cfg = TYPE_CONFIG[ann.type as AnnType] ?? TYPE_CONFIG.info
            const Icon = cfg.icon
            return (
              <div
                key={ann.id}
                className="flex gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-gray-800">{ann.title}</p>
                    {ann.pinned && <Pin className="h-3.5 w-3.5 text-gray-400" />}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ann.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {ann.is_published ? 'Publicado' : 'Borrador'}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{ann.body}</p>
                  {ann.expires_at && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      Expira: {new Date(ann.expires_at).toLocaleDateString('es-CO')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <button
                    type="button"
                    title={ann.is_published ? 'Despublicar' : 'Publicar'}
                    onClick={() =>
                      togglePublish.mutate({ id: ann.id, isPublished: !ann.is_published })
                    }
                    className="rounded p-1 hover:bg-gray-100"
                  >
                    {ann.is_published ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(ann)}
                    className="rounded p-1 hover:bg-gray-100"
                  >
                    <Pencil className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Eliminar este anuncio?')) del.mutate({ id: ann.id })
                    }}
                    className="rounded p-1 hover:bg-gray-100"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
