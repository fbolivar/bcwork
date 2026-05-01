'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Plus, Trash2, Network } from 'lucide-react'
import { formatDate } from '@/lib/format'

export function IpRangeManager() {
  const [cidr, setCidr] = useState('')
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)

  const utils = trpc.useUtils()
  const { data: ranges, isLoading } = trpc.admin.listIpRanges.useQuery()
  const add = trpc.admin.addIpRange.useMutation({
    onSuccess: () => {
      setCidr('')
      setLabel('')
      setCreating(false)
      void utils.admin.listIpRanges.invalidate()
    },
  })
  const remove = trpc.admin.removeIpRange.useMutation({
    onSuccess: () => utils.admin.listIpRanges.invalidate(),
  })

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-700">
          Los rangos IP corporativos permiten identificar cuándo un empleado trabaja desde la red de
          la empresa vs. desde casa. Usado para contexto en reportes.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Agregar rango
        </button>
      </div>

      {creating && (
        <form
          className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            add.mutate({ cidr, label })
          }}
        >
          <h3 className="text-sm font-semibold text-blue-800">Nuevo rango IP</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">CIDR *</label>
              <input
                type="text"
                required
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="192.168.1.0/24"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Etiqueta *</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Oficina Bogotá"
              />
            </div>
          </div>
          {add.error && <p className="text-sm text-red-600">{add.error.message}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={add.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {add.isPending ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="h-32 animate-pulse rounded-xl bg-gray-100" />}

      {!isLoading && (ranges ?? []).length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12">
          <Network className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Sin rangos IP configurados.</p>
        </div>
      )}

      {(ranges ?? []).length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">CIDR</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Etiqueta</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Agregado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(ranges ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">{r.cidr}</td>
                  <td className="px-4 py-3 text-gray-700">{r.label}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar ${r.cidr}?`)) remove.mutate({ id: r.id })
                      }}
                      disabled={remove.isPending}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
