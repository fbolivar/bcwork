'use client'

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
}

export function GeoLocationWidget({ locations }: { locations: UserLoc[] }) {
  const mapped = locations.filter((l) => l.lat !== null && l.lon !== null)

  const byCountry: Record<string, number> = {}
  for (const l of mapped) {
    const key = l.country ?? 'Desconocido'
    byCountry[key] = (byCountry[key] ?? 0) + 1
  }
  const countrySummary = Object.entries(byCountry).sort((a, b) => b[1] - a[1])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Ubicación geográfica del equipo</h3>
        <span className="text-xs text-gray-400">{locations.length} usuarios · últimos 30 días</span>
      </div>

      {/* World map — fixed height container */}
      <div
        className="overflow-hidden rounded-xl"
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
          {mapped.map((loc) => (
            <Marker key={loc.user_id} coordinates={[loc.lon!, loc.lat!]}>
              <circle r={5} fill="#06b6d4" stroke="#fff" strokeWidth={1.2} opacity={0.9} />
              <circle r={10} fill="#06b6d4" opacity={0.2} />
              <title>
                {loc.full_name} — {[loc.city, loc.country].filter(Boolean).join(', ')}
              </title>
            </Marker>
          ))}
        </ComposableMap>
      </div>

      {/* Country breakdown */}
      {countrySummary.length > 0 ? (
        <div className="mt-4 space-y-2">
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
