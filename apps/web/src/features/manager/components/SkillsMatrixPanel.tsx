'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Layers, Plus, X, Pencil } from 'lucide-react'

const SKILL_CATEGORIES = ['general', 'technical', 'soft_skills', 'leadership', 'domain']
const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  technical: 'Técnico',
  soft_skills: 'Habilidades blandas',
  leadership: 'Liderazgo',
  domain: 'Dominio',
}
const LEVEL_LABELS = ['', 'Básico', 'Elemental', 'Intermedio', 'Avanzado', 'Experto']
const LEVEL_COLORS = ['', 'bg-gray-200', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600', 'bg-blue-800']

function LevelDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`h-2 w-2 rounded-full ${n <= level ? LEVEL_COLORS[level] : 'bg-gray-100'}`}
        />
      ))}
    </div>
  )
}

export function SkillsMatrixPanel() {
  const utils = trpc.useUtils()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [skillName, setSkillName] = useState('')
  const [skillCategory, setSkillCategory] = useState('technical')
  const [skillLevel, setSkillLevel] = useState(3)
  const [skillNotes, setSkillNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: teams } = trpc.manager.getMyTeams.useQuery()
  const teamId = teams?.[0]?.id

  const { data, isLoading } = trpc.manager.getTeamSkills.useQuery({ teamId })
  const members = (data?.members ?? []) as any[]
  const skills = (data?.skills ?? []) as any[]

  const upsert = trpc.manager.upsertSkill.useMutation({
    onSuccess: () => {
      utils.manager.getTeamSkills.invalidate()
      setShowAdd(false)
      resetForm()
    },
  })
  const del = trpc.manager.deleteSkill.useMutation({
    onSuccess: () => utils.manager.getTeamSkills.invalidate(),
  })

  function resetForm() {
    setSkillName('')
    setSkillCategory('technical')
    setSkillLevel(3)
    setSkillNotes('')
    setEditingId(null)
  }

  const filteredSkills = skills.filter((s) => {
    if (selectedUser && s.user_id !== selectedUser) return false
    if (filterCategory && s.category !== filterCategory) return false
    return true
  })

  const skillsByUser = filteredSkills.reduce((acc: Record<string, any[]>, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = []
    acc[s.user_id]!.push(s)
    return acc
  }, {})

  const displayMembers = selectedUser ? members.filter((m) => m.id === selectedUser) : members

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Matriz de competencias</h2>
          <p className="mt-0.5 text-sm text-gray-500">Habilidades y niveles por empleado</p>
        </div>
        {selectedUser && (
          <button
            type="button"
            onClick={() => {
              setShowAdd(true)
              setEditingId(null)
              resetForm()
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Agregar habilidad
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!selectedUser ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            Todos
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedUser(m.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${selectedUser === m.id ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {m.full_name ?? m.email}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setFilterCategory('')}
          className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${!filterCategory ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          Todas
        </button>
        {SKILL_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilterCategory(filterCategory === c ? '' : c)}
            className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${filterCategory === c ? 'bg-gray-800 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : displayMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Layers className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Sin miembros en el equipo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayMembers.map((m) => {
            const userSkills = (skillsByUser[m.id] ?? []).sort(
              (a: any, b: any) => b.level - a.level,
            )
            return (
              <div
                key={m.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white"
              >
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {(m.full_name ?? m.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{m.full_name ?? m.email}</p>
                    {m.department && (
                      <p className="text-[10px] text-gray-400">
                        {m.department} · {m.position}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{userSkills.length} habilidades</span>
                </div>
                {userSkills.length === 0 ? (
                  <div className="px-4 py-4 text-center text-sm text-gray-400">
                    Sin habilidades registradas.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(m.id)
                        setShowAdd(true)
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Agregar
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {userSkills.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{s.skill_name}</p>
                          <p className="text-[10px] text-gray-400">
                            {CATEGORY_LABELS[s.category] ?? s.category}
                          </p>
                        </div>
                        <LevelDots level={s.level} />
                        <span className="w-20 text-xs text-gray-500">{LEVEL_LABELS[s.level]}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(m.id)
                              setSkillName(s.skill_name)
                              setSkillCategory(s.category)
                              setSkillLevel(s.level)
                              setSkillNotes(s.notes ?? '')
                              setEditingId(s.id)
                              setShowAdd(true)
                            }}
                            className="rounded p-1 text-gray-300 hover:text-blue-500"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => del.mutate({ id: s.id })}
                            className="rounded p-1 text-gray-300 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showAdd && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {editingId ? 'Editar habilidad' : 'Nueva habilidad'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false)
                  resetForm()
                }}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">Habilidad</label>
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="Ej: React, Comunicación, SQL..."
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Categoría</label>
                <select
                  value={skillCategory}
                  onChange={(e) => setSkillCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                >
                  {SKILL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Nivel: <span className="text-blue-600">{LEVEL_LABELS[skillLevel]}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(Number(e.target.value))}
                  className="mt-1 w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  {LEVEL_LABELS.slice(1).map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Notas (opcional)</label>
                <textarea
                  value={skillNotes}
                  onChange={(e) => setSkillNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false)
                  resetForm()
                }}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!skillName.trim() || upsert.isPending}
                onClick={() =>
                  upsert.mutate({
                    user_id: selectedUser!,
                    skill_name: skillName.trim(),
                    category: skillCategory,
                    level: skillLevel,
                    notes: skillNotes || undefined,
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
