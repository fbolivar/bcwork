'use client'

interface DataPoint {
  date: string
  active_seconds: number
  productive_seconds: number
  non_productive_seconds: number
  productivity_ratio: number
  overtime_seconds: number
  user_count: number
}

interface Props {
  data: DataPoint[]
}

const H = 160
const PAD = { top: 8, right: 8, bottom: 28, left: 44 }

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
}

export function TrendChart({ data }: Props) {
  if (data.length === 0) return null

  const maxVal = Math.max(...data.map((d) => d.active_seconds), 1)
  const W_inner = 100 - (PAD.left + PAD.right) / 4
  const H_inner = H - PAD.top - PAD.bottom
  const step = W_inner / Math.max(data.length - 1, 1)

  // Usar viewBox con unidades relativas
  const vW = 600
  const vH = H + PAD.top + PAD.bottom
  const innerW = vW - PAD.left * 6 - PAD.right * 6
  const innerH = H_inner

  const toX = (i: number) => PAD.left * 6 + i * (innerW / Math.max(data.length - 1, 1))
  const toY = (secs: number) => PAD.top + innerH - (secs / maxVal) * innerH

  // Línea de tiempo activo
  const activePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.active_seconds)}`)
    .join(' ')
  // Línea de tiempo productivo
  const prodPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.productive_seconds)}`)
    .join(' ')

  // Área productiva (relleno)
  const prodArea =
    prodPath + ` L${toX(data.length - 1)},${PAD.top + innerH} L${toX(0)},${PAD.top + innerH} Z`

  const fmtHM = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h` : `${m}m`
  }

  // Etiquetas eje Y
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: toY(maxVal * f),
    label: fmtHM(maxVal * f),
  }))

  // Etiquetas eje X (máximo 7)
  const xStep = Math.ceil(data.length / 7)
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1)

  return (
    <div>
      <svg
        viewBox={`0 0 ${vW} ${vH}`}
        className="w-full"
        style={{ height: H + PAD.top + PAD.bottom }}
      >
        {/* Grid */}
        {yLabels.map((l) => (
          <g key={l.label}>
            <line
              x1={PAD.left * 6}
              y1={l.y}
              x2={vW - PAD.right * 6}
              y2={l.y}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
            <text x={PAD.left * 6 - 6} y={l.y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
              {l.label}
            </text>
          </g>
        ))}

        {/* Área productiva */}
        <path d={prodArea} fill="#22c55e" fillOpacity={0.1} />

        {/* Línea tiempo activo */}
        <path d={activePath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />

        {/* Línea tiempo productivo */}
        <path d={prodPath} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinejoin="round" />

        {/* Puntos en la línea de productividad */}
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.productive_seconds)} r={3} fill="#22c55e" />
        ))}

        {/* Eje X */}
        {xLabels.map((d, i) => {
          const idx = data.indexOf(d)
          return (
            <text
              key={i}
              x={toX(idx)}
              y={PAD.top + innerH + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {fmtDate(d.date)}
            </text>
          )
        })}
      </svg>

      {/* Leyenda */}
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-blue-500" />
          Tiempo activo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-green-500" />
          Tiempo productivo
        </span>
      </div>
    </div>
  )
}
