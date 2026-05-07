'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Layers, Plus, X, Pencil, Trash2, Star } from 'lucide-react'

const SKILL_CATEGORIES = ['Técnicas', 'Blandas', 'Liderazgo', 'Idiomas', 'Herramientas', 'Otras']

const LEVEL_LABELS = ['', 'Básico', 'Elemental', 'Intermedio', 'Avanzado', 'Experto']
const LEVEL_COLORS = ['', 'bg-gray-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600']

function SkillBar({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-1.5 w-6 rounded-full ${i <= level ? (LEVEL_COLORS[level] ?? 'bg-blue-500') : 'bg-gray-100'}`}
        />
      ))}
    </div>
  )
}

export function MySkillsPanel() {
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('')

  const [skillName, setSkillName] = useState('')
  const [category, setCategory] = useState('Técnicas')
  const [level, setLevel] = useState(3)
  const [notes, setNotes] = useState('')

  const { data, isLoading } = trpc.employee.getMySkills.useQuery()
  const upsert = trpc.employee.upsertMySkill.useMutation({
    onSuccess: () => {
      utils.employee.getMySkills.invalidate()
      resetForm()
    },
  })
  const del = trpc.employee.deleteMySkill.useMutation({
    onSuccess: () => utils.employee.getMySkills.invalidate(),
  })

  function resetForm() {
    setEditingId(null)
    setSkillName('')
    setCategory('Técnicas')
    setLevel(3)
    setNotes('')
    setShowForm(false)
  }

  function openEdit(s: any) {
    setEditingId(s.id)
    setSkillName(s.skill_name)
    setCategory(s.category ?? 'Técnicas')
    setLevel(s.level ?? 3)
    setNotes(s.notes ?? '')
    setShowForm(true)
  }

  const skills = (data ?? []) as any[]
  const filtered = filterCat ? skills.filter((s) => s.category === filterCat) : skills

  const byCategory = filtered.reduce((acc: Record<string, any[]>, s: any) => {
    const cat = s.category ?? 'Otras'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Mis habilidades</h2>
          <p className="mt-0.5 text-sm text-gray-500">Competencias y nivel de dominio</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      {/* Summary */}
      {skills.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{skills.length}</p>
            <p className="text-[10px] text-gray-400">Habilidades</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {skills.filter((s) => s.level >= 4).length}
            </p>
            <p className="text-[10px] text-gray-400">Avanzadas</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-gray-500">
              {[...new Set(skills.map((s) => s.category).filter(Boolean))].length}
            </p>
            <p className="text-[10px] text-gray-400">Categorías</p>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilterCat('')}
          className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${!filterCat ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          Todas
        </button>
        {SKILL_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilterCat(filterCat === c ? '' : c)}
            className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${filterCat === c ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Layers className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Aún no has registrado habilidades</p>
          <button
            type="button"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            Agregar primera habilidad
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory).map(([cat, catSkills]) => (
            <div key={cat}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {cat}
              </p>
              <div className="space-y-2">
                {(catSkills as any[]).map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">{s.skill_name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <SkillBar level={s.level ?? 1} />
                        <span className="text-[10px] text-gray-400">
                          {LEVEL_LABELS[s.level] ?? ''}
                        </span>
                      </div>
                      {s.notes && <p className="mt-0.5 text-[11px] text-gray-400">{s.notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="rounded p-1 text-gray-300 hover:text-blue-500"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => del.mutate({ id: s.id })}
                        className="rounded p-1 text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {editingId ? 'Editar habilidad' : 'Nueva habilidad'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="Ej: React, Excel, Inglés..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                  >
                    {SKILL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Nivel (1-5)</label>
                  <div className="mt-1.5 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setLevel(n)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${level >= n ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-400'}`}
                      >
                        <Star className={`h-3.5 w-3.5 ${level >= n ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-400">{LEVEL_LABELS[level]}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Notas (opcional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!skillName.trim() || upsert.isPending}
                onClick={() =>
                  upsert.mutate({
                    id: editingId ?? undefined,
                    skill_name: skillName.trim(),
                    category,
                    level,
                    notes: notes || undefined,
                  })
                }
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
