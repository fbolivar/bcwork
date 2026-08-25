import { gzipSync, gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

// Formato propietario .bcw (BCWork backup): contenedor de texto con encabezado
// + cuerpo comprimido (gzip) en base64 + checksum SHA-256 de integridad.
//
//   línea 0: BCWORK          (magic)
//   línea 1: <version>
//   línea 2: <sha256(json)>
//   línea 3: <base64(gzip(json))>

const MAGIC = 'BCWORK'
export const BCW_VERSION = 1

export interface BcwPayload {
  format: 'BCW'
  version: number
  exported_at: string
  tenant_id: string
  data: Record<string, unknown[]>
  meta?: Record<string, unknown>
}

export function encodeBcw(payload: BcwPayload): string {
  const json = JSON.stringify(payload)
  const checksum = createHash('sha256').update(json).digest('hex')
  const body = gzipSync(Buffer.from(json, 'utf8')).toString('base64')
  return [MAGIC, String(payload.version), checksum, body].join('\n') + '\n'
}

export function decodeBcw(content: string): BcwPayload {
  const lines = content.split('\n')
  if (lines[0] !== MAGIC) {
    throw new Error('Archivo .bcw no válido (encabezado incorrecto).')
  }
  const checksum = lines[2]
  const body = lines.slice(3).join('').trim()
  if (!body) throw new Error('Archivo .bcw vacío o corrupto.')

  let json: string
  try {
    json = gunzipSync(Buffer.from(body, 'base64')).toString('utf8')
  } catch {
    throw new Error('No se pudo descomprimir el archivo .bcw.')
  }
  if (createHash('sha256').update(json).digest('hex') !== checksum) {
    throw new Error('El archivo .bcw está dañado (checksum no coincide).')
  }

  let payload: BcwPayload
  try {
    payload = JSON.parse(json) as BcwPayload
  } catch {
    throw new Error('El contenido del archivo .bcw no es válido.')
  }
  if (payload.format !== 'BCW') throw new Error('Formato no reconocido.')
  return payload
}
