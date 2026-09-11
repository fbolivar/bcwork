import type { getDb } from './db'

type Db = ReturnType<typeof getDb>

/**
 * Oficina o remoto a partir de la IP publica con la que llega el agente.
 *
 * Los rangos corporativos se configuran en TI & Seguridad > IPs
 * (corporate_ip_ranges). Si la IP cae en alguno, es oficina; si hay IP pero no
 * cae en ninguno, es remoto; sin IP no se afirma nada. Cuando la empresa no ha
 * configurado rangos tampoco se afirma nada: sin una oficina definida, "remoto"
 * seria un valor por defecto disfrazado de dato.
 */
export async function resolverUbicacion(
  db: Db,
  tenantId: string,
  ip: string | null,
): Promise<'office' | 'remote' | 'unknown'> {
  if (!ip) return 'unknown'
  const { data: rangos } = await db
    .from('corporate_ip_ranges')
    .select('cidr')
    .eq('tenant_id', tenantId)
  if (!rangos?.length) return 'unknown'
  // cidr es tipo inet en Postgres; llega como texto.
  return rangos.some((r) => ipEnRango(ip, String(r.cidr))) ? 'office' : 'remote'
}

/** IPv4 contra CIDR o IP suelta. IPv6 se trata como no coincidente. */
export function ipEnRango(ip: string, cidr: string): boolean {
  const [base, bitsTxt] = cidr.trim().split('/')
  const a = ipv4(ip)
  const b = ipv4(base ?? '')
  if (a === null || b === null) return false
  const bits = bitsTxt === undefined ? 32 : Number(bitsTxt)
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false
  if (bits === 0) return true
  const mascara = (0xffffffff << (32 - bits)) >>> 0
  return (a & mascara) >>> 0 === (b & mascara) >>> 0
}

function ipv4(s: string): number | null {
  const p = s.trim().split('.')
  if (p.length !== 4) return null
  let n = 0
  for (const x of p) {
    if (!/^\d{1,3}$/.test(x)) return null
    const v = Number(x)
    if (v > 255) return null
    n = (n << 8) | v
  }
  return n >>> 0
}
