import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { getAccessTokenFromHeaders } from '@/lib/auth/session'
import { verifyAccessToken } from '@/lib/auth/jwt'

export const runtime = 'nodejs'

// Descarga del instalador por-tenant como ZIP (installers/<tenantId>.zip):
// contiene el MSI firmado (token horneado), el certificado y un Instalar.bat que
// se auto-eleva, confía el certificado e instala — pensado para instalación
// manual equipo por equipo, sin GPO ni avisos. Solo tenant_admin.
export async function GET(req: NextRequest) {
  const jwt = getAccessTokenFromHeaders(req.headers)
  if (!jwt) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let user
  try {
    user = await verifyAccessToken(jwt)
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (user.role !== 'tenant_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!user.tid) {
    return NextResponse.json({ error: 'no_tenant' }, { status: 400 })
  }

  let zip: Buffer
  try {
    zip = await readFile(path.join(process.cwd(), 'installers', `${user.tid}.zip`))
  } catch {
    return NextResponse.json(
      {
        error: 'installer_not_available',
        message:
          'Aún no hay un instalador firmado para tu empresa. Contacta al soporte para generarlo.',
      },
      { status: 503 },
    )
  }

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="BCWork-Agent-Instalador.zip"`,
      'Cache-Control': 'no-store',
    },
  })
}
