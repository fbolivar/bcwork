'use client'

import { useState, useRef, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import { MapPin } from 'lucide-react'

const GEO_URL = '/world-110m.json'

interface UserLoc {
  user_id: string
  full_name: string
  city: string | null
  country: string | null
  country_code: string | null
  lat: number | null
  lon: number | null
  /** 'manual' = la declaró un administrador · 'ip' = estimada por la IP */
  source?: 'manual' | 'ip' | null
}

// La ubicación por IP resuelve a la ciudad donde el ISP registra el rango, no a
// donde está el equipo. Distinguirla de la declarada evita que se lea como una
// medición real.
const DECLARADA = '#06b6d4' // cian: dato afirmado por una persona
const ESTIMADA = '#94a3b8' // gris: aproximación

const esDeclarada = (l: UserLoc) => l.source === 'manual'

function OrigenBadge({ loc }: { loc: UserLoc }) {
  const declarada = esDeclarada(loc)
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
        declarada ? 'bg-cyan-50 text-cyan-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {declarada ? 'declarada' : 'estimada'}
    </span>
  )
}

interface Tooltip {
  loc: UserLoc
  x: number
  y: number
}

export function GeoLocationWidget({ locations }: { locations: UserLoc[] }) {
  const mapped = locations.filter((l) => l.lat !== null && l.lon !== null)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [selected, setSelected] = useState<UserLoc | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  const byCountry: Record<string, number> = {}
  for (const l of mapped) {
    const key = l.country ?? 'Desconocido'
    byCountry[key] = (byCountry[key] ?? 0) + 1
  }
  const countrySummary = Object.entries(byCountry).sort((a, b) => b[1] - a[1])

  const handleMarkerEnter = useCallback((loc: UserLoc, e: React.MouseEvent) => {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      loc,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  const handleMarkerLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  const initials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Ubicación geográfica del equipo</h3>
        <span className="text-xs text-gray-400">{locations.length} usuarios · últimos 30 días</span>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="relative overflow-hidden rounded-xl"
        style={{ background: '#0d1b3e', height: '220px' }}
      >
        <ComposableMap
          width={800}
          height={400}
          projectionConfig={{ scale: 130, center: [10, 10] }}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e3a8a"
                  stroke="#1d4ed8"
                  strokeWidth={0.4}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', fill: '#1e40af' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>
          {mapped.map((loc) => {
            const isSelected = selected?.user_id === loc.user_id
            return (
              <Marker
                key={loc.user_id}
                coordinates={[loc.lon!, loc.lat!]}
                onMouseEnter={(e) => handleMarkerEnter(loc, e as unknown as React.MouseEvent)}
                onMouseLeave={handleMarkerLeave}
                onClick={() => setSelected(isSelected ? null : loc)}
              >
                <g style={{ cursor: 'pointer' }}>
                  <circle
                    r={isSelected ? 14 : 10}
                    fill={isSelected ? '#f59e0b' : esDeclarada(loc) ? DECLARADA : ESTIMADA}
                    opacity={0.2}
                  />
                  {/* Relleno para la declarada; anillo hueco y punteado para la
                      estimada, que no es una medición del equipo. */}
                  <circle
                    r={isSelected ? 7 : 5}
                    fill={
                      isSelected ? '#f59e0b' : esDeclarada(loc) ? DECLARADA : 'rgba(13,27,62,0.85)'
                    }
                    stroke={isSelected ? '#fff' : esDeclarada(loc) ? '#fff' : ESTIMADA}
                    strokeWidth={1.5}
                    strokeDasharray={!isSelected && !esDeclarada(loc) ? '2 1.5' : undefined}
                    opacity={0.95}
                  />
                </g>
              </Marker>
            )
          })}
        </ComposableMap>

        {/* Hover tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 max-w-[180px] rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 40,
              transform: tooltip.x > 200 ? 'translateX(-100%)' : undefined,
            }}
          >
            <p className="text-xs font-semibold text-gray-900">{tooltip.loc.full_name}</p>
            <p className="text-[10px] text-gray-500">
              {[tooltip.loc.city, tooltip.loc.country].filter(Boolean).join(', ') ||
                'Ubicación desconocida'}
            </p>
            <p className="mt-0.5 text-[9px] text-gray-400">
              {esDeclarada(tooltip.loc)
                ? 'Declarada por un administrador'
                : 'Estimada por IP — puede no ser la ciudad real'}
            </p>
          </div>
        )}

        {/* Click selected card */}
        {selected && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-lg border border-yellow-200 bg-white px-3 py-2 shadow-md">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
              {initials(selected.full_name)}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">{selected.full_name}</p>
              <p className="text-[10px] text-gray-500">
                {[selected.city, selected.country].filter(Boolean).join(', ') || '—'}
              </p>
              <p className="text-[9px] text-gray-400">
                {esDeclarada(selected) ? 'Declarada' : 'Estimada por IP'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="ml-1 text-gray-300 hover:text-gray-500"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Leyenda: sin esto, un punto estimado se lee como una medición real */}
      {mapped.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true">
              <circle cx="5" cy="5" r="4" fill={DECLARADA} />
            </svg>
            Declarada por un administrador
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true">
              <circle
                cx="5"
                cy="5"
                r="3.5"
                fill="none"
                stroke={ESTIMADA}
                strokeWidth="1.5"
                strokeDasharray="2 1.5"
              />
            </svg>
            Estimada por IP — ciudad del proveedor de internet, no del equipo
          </span>
        </div>
      )}

      {/* User list */}
      {mapped.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Usuarios con ubicación ({mapped.length})
            </p>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {mapped.map((loc) => (
              <button
                key={loc.user_id}
                type="button"
                onClick={() => setSelected(selected?.user_id === loc.user_id ? null : loc)}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected?.user_id === loc.user_id
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                  {initials(loc.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-800">{loc.full_name}</p>
                  <p className="truncate text-[10px] text-gray-400">
                    {[loc.city, loc.country].filter(Boolean).join(', ') || 'Ubicación desconocida'}
                  </p>
                </div>
                <OrigenBadge loc={loc} />
                <MapPin
                  className={`h-3 w-3 shrink-0 ${
                    esDeclarada(loc) ? 'text-cyan-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Country breakdown */}
      {countrySummary.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Por país
          </p>
          {countrySummary.slice(0, 6).map(([country, count]) => (
            <div key={country} className="flex items-center gap-3">
              <span className="w-32 truncate text-sm text-gray-600">{country}</span>
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-blue-50">
                  <div
                    className="h-1.5 rounded-full bg-cyan-500 transition-all"
                    style={{ width: `${Math.round((count / (locations.length || 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="w-4 text-right text-xs font-semibold text-gray-800">{count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>
            {locations.length > 0
              ? 'Los usuarios están en redes privadas — geolocalización por IP no disponible'
              : 'Sin sesiones registradas en los últimos 30 días'}
          </span>
        </div>
      )}
    </div>
  )
}
