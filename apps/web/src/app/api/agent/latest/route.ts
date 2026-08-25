import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { resolveAgentKey, getBearer } from '@/lib/agent-auth'

export const runtime = 'nodejs'

// Última versión del agente disponible. El servicio la consulta y, si es más
// nueva que la suya, descarga /api/agent/download y se auto-actualiza.
// Aprovecha la llamada para registrar la versión actual del equipo (?current=).
export async function GET(req: NextRequest) {
  const rawKey = getBearer(req)
  if (!rawKey) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = getDb()
  const identity = await resolveAgentKey(db, rawKey, 'ingest:activity')
  if (!identity) return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })

  // Registrar la versión reportada por el agente (visibilidad de flota).
  const current = req.nextUrl.searchParams.get('current')
  if (current && /^[\w.\-]{1,50}$/.test(current)) {
    await db.from('agent_devices').update({ service_version: current }).eq('id', identity.deviceId)
  }

  const { data: release } = await db
    .from('agent_release')
    .select('version, sha256')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!release) return NextResponse.json({ version: null })

  return NextResponse.json({
    version: release.version,
    sha256: release.sha256,
    url: '/api/agent/download',
  })
}
