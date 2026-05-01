import { cn } from '@bcwork/ui'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'blue' | 'green' | 'yellow' | 'red'
}

const ACCENT_CLASSES = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  green: 'border-green-200 bg-green-50 text-green-700',
  yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  red: 'border-red-200 bg-red-50 text-red-700',
}

export function MetricCard({ label, value, sub, accent }: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-5',
        accent ? ACCENT_CLASSES[accent] : 'border-gray-200 bg-white',
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
    </div>
  )
}
