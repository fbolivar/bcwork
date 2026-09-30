'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { FolderTree, Check, Pencil } from 'lucide-react'

/**
 * Unificar nombres de departamento. En los datos del cliente suele haber la
 * misma área escrita de varias formas (p. ej. «Logística», «Logístico»,
 * «Logisitca-Compras»); esto las fusiona en una sola para que los promedios
 * por área tengan sentido.
 */
export function DepartmentManager() {
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.admin.listDepartments.useQuery()
  const [editando, setEditando] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState('')

  const rename = trpc.admin.renameDepartment.useMutation({
    onSuccess: () => {
      void utils.admin.listDepartments.invalidate()
      void utils.admin.listUsers.invalidate()
      setEditando(null)
      setNuevo('')
    },
  })

  const deptos = data ?? []
  const nombres = deptos.map((d) => d.name)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <FolderTree className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-gray-900">Departamentos</h2>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Unifica los nombres escritos de varias formas. Renombrar a un nombre que ya existe fusiona
        las dos áreas.
      </p>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
      ) : deptos.length === 0 ? (
        <p className="text-sm text-gray-400">Aún no hay departamentos asignados.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {deptos.map((d) => (
            <li key={d.name} className="flex items-center gap-3 py-2.5">
              {editando === d.name ? (
                <>
                  <input
                    list="dept-existentes"
                    value={nuevo}
                    onChange={(e) => setNuevo(e.target.value)}
                    placeholder="Nuevo nombre…"
                    autoFocus
                    className="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    disabled={!nuevo.trim() || nuevo.trim() === d.name || rename.isPending}
                    onClick={() => rename.mutate({ from: d.name, to: nuevo.trim() })}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    {rename.isPending ? 'Guardando…' : 'Aplicar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(null)
                      setNuevo('')
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-800">{d.name}</span>
                  <span className="text-xs text-gray-400">
                    {d.people} persona{d.people === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(d.name)
                      setNuevo(d.name)
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    <Pencil className="h-3 w-3" />
                    Renombrar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <datalist id="dept-existentes">
        {nombres.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      {rename.isSuccess && (
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3.5 w-3.5" />
          Departamentos actualizados.
        </p>
      )}
      {rename.error && <p className="mt-3 text-xs text-red-600">{rename.error.message}</p>}
    </div>
  )
}
