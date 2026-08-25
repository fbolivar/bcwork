import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { getAccessTokenFromHeaders } from '@/lib/auth/session'
import { verifyAccessToken } from '@/lib/auth/jwt'

export const runtime = 'nodejs'

// Descarga del instalador por-tenant. El token en claro NO se persiste (solo su
// hash), por eso se recibe aquí y se inyecta en el MSI en el momento de la
// descarga. El resultado es un único .msi listo para ejecutar / empujar por GPO.

// Placeholder de 64 chars pre-sembrado en la propiedad TENANT_TOKEN del MSI (WiX).
// El token del tenant también mide 64 chars (32 bytes hex) → mismo ancho, byte-patch estable.
const PLACEHOLDER = 'BCWORK_TENANT_TOKEN_PLACEHOLDER_00000000000000000000000000000000'

const BodySchema = z.object({ token: z.string().length(64) })

function patchInstaller(buf: Buffer, token: string): Buffer {
  const out = Buffer.from(buf)
  let patched = 0
  // MSI puede almacenar la propiedad en ASCII o UTF-16LE: intentamos ambos.
  for (const enc of ['ascii', 'utf16le'] as const) {
    const needle = Buffer.from(PLACEHOLDER, enc)
    const replacement = Buffer.from(token, enc)
    if (needle.length !== replacement.length) continue
    let idx = out.indexOf(needle)
    while (idx !== -1) {
      replacement.copy(out, idx)
      patched++
      idx = out.indexOf(needle, idx + needle.length)
    }
  }
  if (patched === 0) throw new Error('placeholder_not_found')
  return out
}

export async function POST(req: NextRequest) {
  // Auth: solo tenant_admin del tenant dueño del token
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  // El token debe pertenecer a este tenant y estar activo
  const db = getDb()
  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex')
  const { data: prov } = await db
    .from('agent_provisioning_tokens')
    .select('id, tenant_id, revoked_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!prov || prov.tenant_id !== user.tid || prov.revoked_at) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
  }

  // Origen del MSI estático. Preferimos un archivo empaquetado con el app
  // (installers/bcwork-agent.msi) para que el botón funcione sin hosting externo
  // ni variables de entorno. Si se define AGENT_INSTALLER_URL, se usa esa URL.
  const installerUrl = process.env.AGENT_INSTALLER_URL
  let base: Buffer
  if (installerUrl) {
    try {
      const res = await fetch(installerUrl)
      if (!res.ok) throw new Error(`fetch ${res.status}`)
      base = Buffer.from(await res.arrayBuffer())
    } catch (e) {
      return NextResponse.json(
        { error: 'installer_fetch_failed', detail: String(e) },
        { status: 502 },
      )
    }
  } else {
    try {
      base = await readFile(path.join(process.cwd(), 'installers', 'bcwork-agent.msi'))
    } catch {
      return NextResponse.json(
        {
          error: 'installer_not_available',
          message:
            'El instalador aún no está disponible en el servidor. Vuelve a intentar en unos minutos.',
        },
        { status: 503 },
      )
    }
  }

  let patched: Buffer
  try {
    patched = patchInstaller(base, parsed.data.token)
  } catch {
    return NextResponse.json(
      {
        error: 'token_injection_failed',
        message: 'El MSI no contiene el placeholder de token (revisar plantilla WiX de la Fase 3).',
      },
      { status: 500 },
    )
  }

  const filename = `BCWork-Agent-${user.tid.slice(0, 8)}.msi`
  return new NextResponse(new Uint8Array(patched), {
    status: 200,
    headers: {
      'Content-Type': 'application/x-msi',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
