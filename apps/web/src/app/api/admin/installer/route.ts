import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { getAccessTokenFromHeaders } from '@/lib/auth/session'
import { verifyAccessToken } from '@/lib/auth/jwt'

export const runtime = 'nodejs'

// Descarga del instalador por-tenant, YA FIRMADO. Cada tenant tiene su MSI
// pre-compilado con su token horneado y firmado (installers/<tenantId>.msi).
// No se parchea en tiempo de descarga porque cualquier cambio a un MSI firmado
// invalidaría la firma. Solo tenant_admin puede descargarlo.
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

  let msi: Buffer
  try {
    msi = await readFile(path.join(process.cwd(), 'installers', `${user.tid}.msi`))
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

  return new NextResponse(new Uint8Array(msi), {
    status: 200,
    headers: {
      'Content-Type': 'application/x-msi',
      'Content-Disposition': `attachment; filename="BCWork-Agent.msi"`,
      'Cache-Control': 'no-store',
    },
  })
}
