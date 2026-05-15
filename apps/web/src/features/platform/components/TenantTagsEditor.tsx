'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { X, Plus, Tag } from 'lucide-react'

const PRESET_TAGS = [
  'enterprise',
  'startup',
  'pyme',
  'healthcare',
  'fintech',
  'logística',
  'retail',
  'alto-potencial',
  'en-riesgo',
  'expansion',
  'priority',
]

export function TenantTagsEditor({ tenantId }: { tenantId: string }) {
  const utils = trpc.useUtils()
  const [input, setInput] = useState('')
  const [showPresets, setShowPresets] = useState(false)

  const { data: tags } = trpc.platform.getTenantTags.useQuery({ tenantId })
  const { data: allTags } = trpc.platform.getAllTags.useQuery()

  const addTag = trpc.platform.addTenantTag.useMutation({
    onSuccess: () => {
      utils.platform.getTenantTags.invalidate({ tenantId })
      utils.platform.getAllTags.invalidate()
      setInput('')
    },
  })

  const removeTag = trpc.platform.removeTenantTag.useMutation({
    onSuccess: () => {
      utils.platform.getTenantTags.invalidate({ tenantId })
      utils.platform.getAllTags.invalidate()
    },
  })

  function handleAdd(tag: string) {
    const clean = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!clean || (tags ?? []).includes(clean)) return
    addTag.mutate({ tenantId, tag: clean })
  }

  const suggestions = [...new Set([...PRESET_TAGS, ...(allTags ?? [])])].filter(
    (t) => !(tags ?? []).includes(t),
  )

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Tag className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">Segmentos / Etiquetas</h3>
      </div>

      {/* Tags actuales */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(tags ?? []).length === 0 && (
          <span className="text-xs text-gray-400">Sin etiquetas asignadas</span>
        )}
        {(tags ?? []).map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag.mutate({ tenantId, tag })}
              disabled={removeTag.isPending}
              className="ml-0.5 rounded-full hover:bg-blue-100"
              title={`Quitar ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Input nuevo tag */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAdd(input)
              }
            }}
            onFocus={() => setShowPresets(true)}
            onBlur={() => setTimeout(() => setShowPresets(false), 150)}
            placeholder="Agregar etiqueta..."
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showPresets && suggestions.length > 0 && (
            <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              {suggestions.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => handleAdd(s)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Tag className="h-3 w-3 text-gray-400" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleAdd(input)}
          disabled={addTag.isPending || !input.trim()}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir
        </button>
      </div>
    </div>
  )
}
