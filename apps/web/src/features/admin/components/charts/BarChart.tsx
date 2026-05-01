'use client'

interface Bar {
  label: string
  value: number
  formatted: string
}

interface Props {
  data: Bar[]
}

export function BarChart({ data }: Props) {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="space-y-2">
      {data.map((bar, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-36 shrink-0 truncate text-xs text-gray-600" title={bar.label}>
            {bar.label}
          </span>
          <div className="flex-1">
            <div className="h-5 overflow-hidden rounded-sm bg-gray-100">
              <div
                className="h-full rounded-sm bg-blue-500 transition-all duration-500"
                style={{ width: `${(bar.value / max) * 100}%` }}
              />
            </div>
          </div>
          <span className="w-12 text-right text-xs tabular-nums text-gray-500">
            {bar.formatted}
          </span>
        </div>
      ))}
    </div>
  )
}
