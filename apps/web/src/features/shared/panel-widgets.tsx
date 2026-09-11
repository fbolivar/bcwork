'use client'

import Link from 'next/link'
import { COLOR, horasCortas } from '@/features/admin/components/panel-identidad'

/**
 * Widgets compartidos por el Resumen del administrador y "Mi día" del
 * empleado. Un mismo dato se ve igual en las dos pantallas.
 */

/** Área de 7 puntos, sin ejes: solo dice si la serie sube o baja. */
export function Sparkline({ values, fill }: { values: (number | null)[]; fill: string }) {
  if (values.length < 2) return <div className="h-10" />
  const nums = values.map((v) => v ?? 0)
  const max = Math.max(...nums, 1)
  const W = 100
  const H = 36
  const paso = W / (nums.length - 1)
  const pts = nums.map((v, i) => [i * paso, H - (v / max) * (H - 4) - 2] as const)
  const linea = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-10 w-full">
      <path d={`${linea} L${W},${H} L0,${H} Z`} fill={fill} />
    </svg>
  )
}

export function Kpi({
  titulo,
  valor,
  tono,
  spark,
  ayuda,
  nota,
}: {
  titulo: string
  valor: string
  tono: 'ok' | 'mal' | 'neutro'
  spark: (number | null)[]
  ayuda: string
  nota?: string
}) {
  const color = tono === 'ok' ? 'text-green-600' : tono === 'mal' ? 'text-red-600' : 'text-gray-400'
  const relleno =
    tono === 'ok' ? COLOR.sparkOk : tono === 'mal' ? COLOR.sparkMal : COLOR.sparkNeutro
  return (
    <div
      className="flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white"
      title={ayuda}
    >
      <div className="px-4 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {titulo}
        </p>
        <p className={`mt-1 text-3xl font-bold tabular-nums ${color}`}>{valor}</p>
        {nota && <p className="mt-0.5 text-[11px] text-gray-400">{nota}</p>}
      </div>
      <Sparkline values={spark} fill={relleno} />
    </div>
  )
}

export interface Tramo {
  etiqueta: string
  productive: number
  nonProductive: number
  neutral: number
}

/**
 * Barras apiladas productivo/neutral/improductivo. Recibe los tramos ya
 * recortados; `cadaN` controla cuántas etiquetas se muestran.
 */
export function BarraApilada({ tramos, cadaN = 3 }: { tramos: Tramo[]; cadaN?: number }) {
  if (tramos.length === 0) {
    return <p className="py-14 text-center text-xs text-gray-400">Sin actividad registrada.</p>
  }
  const max = Math.max(...tramos.map((f) => f.productive + f.nonProductive + f.neutral), 1)
  return (
    <div className="flex h-56 items-stretch gap-1 px-1">
      {tramos.map((f, i) => {
        const total = f.productive + f.nonProductive + f.neutral
        const alto = (total / max) * 100
        const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)
        return (
          <div
            key={f.etiqueta}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <div
              className="flex w-full flex-col-reverse overflow-hidden rounded-sm"
              style={{ height: `${Math.max(alto, total > 0 ? 3 : 0)}%` }}
              title={`${f.etiqueta} · productivo ${horasCortas(f.productive)} · improductivo ${horasCortas(f.nonProductive)} · neutral ${horasCortas(f.neutral)}`}
            >
              <div style={{ height: `${pct(f.productive)}%`, background: COLOR.productivo }} />
              <div style={{ height: `${pct(f.neutral)}%`, background: COLOR.neutral }} />
              <div style={{ height: `${pct(f.nonProductive)}%`, background: COLOR.improductivo }} />
            </div>
            {total === 0 && <div className="h-px w-full bg-gray-200" />}
            <span className="text-[10px] tabular-nums text-gray-400">
              {i % cadaN === 0 ? f.etiqueta : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function LeyendaClases() {
  return (
    <div className="flex gap-3 text-[11px] text-gray-500">
      <span className="flex items-center gap-1">
        <i
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ background: COLOR.productivo }}
        />
        Productivo
      </span>
      <span className="flex items-center gap-1">
        <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR.neutral }} />
        Neutral
      </span>
      <span className="flex items-center gap-1">
        <i
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ background: COLOR.improductivo }}
        />
        Improductivo
      </span>
    </div>
  )
}

export interface AppItem {
  name: string
  seconds: number
}

export function ColumnaApps({
  titulo,
  color,
  total,
  count,
  top,
  href,
  columnas = 1,
}: {
  titulo: string
  color: string
  total: number
  count: number
  top: AppItem[]
  href?: string
  /** 1 para listas verticales estrechas, 2 o 4 para tarjetas anchas. */
  columnas?: 1 | 2 | 4
}) {
  const grid =
    columnas === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : columnas === 2 ? 'sm:grid-cols-2' : ''
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="h-1" style={{ background: color }} />
      <div className="flex items-baseline justify-between px-4 pb-1 pt-3">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
          {titulo}
        </p>
        <span className="text-lg font-bold tabular-nums text-gray-900">{horasCortas(total)}</span>
      </div>
      {top.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-gray-400">Sin uso registrado</p>
      ) : (
        <ul className={`grid gap-x-6 px-4 py-1 ${grid}`}>
          {top.map((a) => (
            <li key={a.name} className="flex items-center justify-between py-1.5 text-sm">
              <span className="truncate pr-3 text-gray-800" title={a.name}>
                {a.name}
              </span>
              <span className="shrink-0 tabular-nums text-gray-500">{horasCortas(a.seconds)}</span>
            </li>
          ))}
        </ul>
      )}
      {(href || count > top.length) && (
        <div className="border-t border-gray-100 px-4 py-2.5">
          {href ? (
            <Link href={href} className="text-xs text-blue-600 hover:underline">
              Ver todo ({count})
            </Link>
          ) : (
            <span className="text-xs text-gray-400">{count} en total</span>
          )}
        </div>
      )}
    </div>
  )
}
