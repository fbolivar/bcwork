import type { getDb } from '@/lib/db'

type Db = ReturnType<typeof getDb>

/**
 * Ausencias justificadas (incapacidad, vacaciones, permiso) aprobadas.
 *
 * Un día cubierto por una ausencia aprobada no es una falta: no cuenta como
 * "ausente", no penaliza la asistencia y la productividad se mide solo sobre
 * los días realmente trabajados. Lo consultan el panel del día, los informes
 * y el analista para no castigar a alguien que estaba incapacitado.
 */

export const TIPO_AUSENCIA: Record<string, string> = {
  sick: 'incapacidad',
  vacation: 'vacaciones',
  personal: 'permiso',
}

export interface Ausencias {
  /** Tipo de ausencia aprobada de `uid` en `dia` (YYYY-MM-DD), o null. */
  tipoEn: (uid: string, dia: string) => string | null
  /** Días de ausencia aprobada de `uid` dentro de [from, to], por tipo. */
  diasDe: (uid: string, from: string, to: string) => number
  hay: boolean
}

function sumaUnDia(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export async function cargarAusencias(
  db: Db,
  tenantId: string,
  from: string,
  to: string,
): Promise<Ausencias> {
  const { data } = await db
    .from('absence_requests')
    .select('employee_id, type, start_date, end_date')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .lte('start_date', to)
    .gte('end_date', from)

  // Por persona: lista de rangos [inicio, fin] con su tipo.
  const porUsuario = new Map<string, { desde: string; hasta: string; tipo: string }[]>()
  for (const a of data ?? []) {
    const lista = porUsuario.get(a.employee_id) ?? []
    lista.push({ desde: a.start_date, hasta: a.end_date, tipo: a.type })
    porUsuario.set(a.employee_id, lista)
  }

  const tipoEn = (uid: string, dia: string): string | null => {
    for (const r of porUsuario.get(uid) ?? []) {
      if (r.desde <= dia && dia <= r.hasta) return r.tipo
    }
    return null
  }

  const diasDe = (uid: string, rFrom: string, rTo: string): number => {
    let n = 0
    for (let d = rFrom; d <= rTo; d = sumaUnDia(d)) {
      if (tipoEn(uid, d)) n++
    }
    return n
  }

  return { tipoEn, diasDe, hay: (data ?? []).length > 0 }
}
