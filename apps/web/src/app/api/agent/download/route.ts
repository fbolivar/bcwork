import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { getDb } from '@/lib/db'
import { resolveAgentKey, getBearer } from '@/lib/agent-auth'

export const runtime = 'nodejs'

// MSI genérico firmado de la última versión, para auto-actualización.
// No lleva token de tenant: el agente ya está aprovisionado y conserva su
// identidad (credenciales en ProgramData) tras el upgrade.
export async function GET(req: NextRequest) {
  const rawKey = getBearer(req)
  if (!rawKey) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = getDb()
  const identity = await resolveAgentKey(db, rawKey, 'ingest:activity')
  if (!identity) return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })

  let msi: Buffer
  try {
    msi = await readFile(path.join(process.cwd(), 'installers', 'update.msi'))
  } catch {
    return NextResponse.json({ error: 'no_update' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(msi), {
    status: 200,
    headers: {
      'Content-Type': 'application/x-msi',
      'Content-Disposition': 'attachment; filename="BCWork-Agent-Update.msi"',
      'Cache-Control': 'no-store',
    },
  })
}
