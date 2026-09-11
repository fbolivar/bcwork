/**
 * Identidad visual del panel de administración.
 *
 * Un mismo significado lleva siempre el mismo color, en cualquier widget:
 * verde es productivo, naranja es improductivo, gris es neutral. Antes cada
 * componente traía su paleta (cian aquí, violeta allá) y el mismo dato se veía
 * distinto según la caja en que cayera.
 */
export const COLOR = {
  productivo: '#22c55e',
  improductivo: '#f97316',
  neutral: '#d1d5db',
  inactivo: '#94a3b8',
  /** Series secundarias (tendencias). */
  cumplimiento: '#0f766e',
  /** Relleno de sparkline. */
  sparkOk: '#bbf7d0',
  sparkNeutro: '#e5e7eb',
} as const

export function horasCortas(secs: number): string {
  if (secs <= 0) return '0m'
  const h = Math.floor(secs / 3600)
  const m = Math.round((secs % 3600) / 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}
