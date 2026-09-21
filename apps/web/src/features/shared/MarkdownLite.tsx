'use client'

import { Fragment, type ReactNode } from 'react'

/**
 * Markdown mínimo para textos que genera BCWork (informes del analista):
 * encabezados, listas, negrita, tablas y párrafos. No pretende cubrir la
 * especificación; cubre lo que el modelo escribe.
 */

function inline(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return partes.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {p.slice(2, -2)}
        </strong>
      )
    if (p.startsWith('`') && p.endsWith('`'))
      return (
        <code key={i} className="rounded bg-gray-100 px-1 text-[0.9em]">
          {p.slice(1, -1)}
        </code>
      )
    return <Fragment key={i}>{p}</Fragment>
  })
}

export function MarkdownLite({ text }: { text: string }) {
  const lineas = text.replace(/\r\n/g, '\n').split('\n')
  const out: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lineas.length) {
    const l = lineas[i]!
    const t = l.trim()
    if (!t) {
      i++
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(t)
    if (h) {
      const nivel = h[1]!.length
      const cls =
        nivel <= 2
          ? 'mt-6 text-base font-semibold text-gray-900'
          : 'mt-4 text-sm font-semibold text-gray-900'
      out.push(
        <p key={k++} className={cls}>
          {inline(h[2]!)}
        </p>,
      )
      i++
      continue
    }
    if (/^[-*]\s+/.test(t) || /^\d+[.)]\s+/.test(t)) {
      const ordenada = /^\d+[.)]\s+/.test(t)
      const items: ReactNode[] = []
      while (i < lineas.length) {
        const s = lineas[i]!.trim()
        const m = ordenada ? /^\d+[.)]\s+(.*)$/.exec(s) : /^[-*]\s+(.*)$/.exec(s)
        if (!m) break
        items.push(<li key={items.length}>{inline(m[1]!)}</li>)
        i++
      }
      out.push(
        ordenada ? (
          <ol key={k++} className="mt-2 list-decimal space-y-1 pl-5">
            {items}
          </ol>
        ) : (
          <ul key={k++} className="mt-2 list-disc space-y-1 pl-5">
            {items}
          </ul>
        ),
      )
      continue
    }
    if (t.startsWith('|')) {
      const filas: string[][] = []
      while (i < lineas.length && lineas[i]!.trim().startsWith('|')) {
        const celdas = lineas[i]!.trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim())
        if (!celdas.every((c) => /^:?-{2,}:?$/.test(c))) filas.push(celdas)
        i++
      }
      const [cab, ...cuerpo] = filas
      out.push(
        <div key={k++} className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            {cab && (
              <thead>
                <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-wider text-gray-400">
                  {cab.map((c, j) => (
                    <th key={j} className="py-1.5 pr-3 font-semibold">
                      {inline(c)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {cuerpo.map((f, r) => (
                <tr key={r} className="border-b border-gray-100">
                  {f.map((c, j) => (
                    <td key={j} className="py-1.5 pr-3 align-top text-gray-700">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }
    // Párrafo: líneas seguidas hasta una en blanco.
    const parrafo: string[] = []
    while (
      i < lineas.length &&
      lineas[i]!.trim() &&
      !/^(#{1,4}\s|[-*]\s|\d+[.)]\s|\|)/.test(lineas[i]!.trim())
    ) {
      parrafo.push(lineas[i]!.trim())
      i++
    }
    out.push(
      <p key={k++} className="mt-2 leading-relaxed">
        {inline(parrafo.join(' '))}
      </p>,
    )
  }
  return <div className="text-sm text-gray-700">{out}</div>
}
