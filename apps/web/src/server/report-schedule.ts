/**
 * Frecuencias de los informes programados.
 *
 * La tabla `scheduled_reports` guarda una expresion cron, pero la aplicacion
 * solo ofrece tres frecuencias: diaria, semanal y mensual. Interpretar cron
 * completo (rangos, listas, pasos, `L`, `#`) seria escribir un evaluador para
 * expresiones que nadie puede crear desde la interfaz, y equivocarse ahi
 * significa mandar un informe a la hora que no es o no mandarlo nunca.
 *
 * Asi que se soporta exactamente el subconjunto que la aplicacion emite y
 * cualquier otra expresion se rechaza de forma explicita, en vez de correr con
 * una interpretacion aproximada.
 */

export type Frecuencia =
  | { tipo: 'diaria'; hora: number; minuto: number }
  | { tipo: 'semanal'; hora: number; minuto: number; diaSemana: number } // 0 = domingo
  | { tipo: 'mensual'; hora: number; minuto: number; diaMes: number }

export function toCron(f: Frecuencia): string {
  if (f.tipo === 'diaria') return `${f.minuto} ${f.hora} * * *`
  if (f.tipo === 'semanal') return `${f.minuto} ${f.hora} * * ${f.diaSemana}`
  return `${f.minuto} ${f.hora} ${f.diaMes} * *`
}

export function parseCron(expr: string): Frecuencia | null {
  const p = expr.trim().split(/\s+/)
  if (p.length !== 5) return null
  const [min, hor, diaMes, mes, diaSem] = p as [string, string, string, string, string]
  if (mes !== '*') return null

  const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : null)
  const minuto = num(min)
  const hora = num(hor)
  if (minuto === null || hora === null || minuto > 59 || hora > 23) return null

  if (diaMes === '*' && diaSem === '*') return { tipo: 'diaria', hora, minuto }
  if (diaMes === '*') {
    const d = num(diaSem)
    if (d === null || d > 6) return null
    return { tipo: 'semanal', hora, minuto, diaSemana: d }
  }
  if (diaSem === '*') {
    const d = num(diaMes)
    if (d === null || d < 1 || d > 28) return null // 29-31 no existe en todo mes
    return { tipo: 'mensual', hora, minuto, diaMes: d }
  }
  return null
}

const MIN = 60_000

/**
 * Proximo disparo estrictamente posterior a `desde`, en la zona del tenant.
 *
 * `offsetMinutos` es el desfase de la zona respecto a UTC (Colombia: -300). Sin
 * el, un informe pedido "a las 7:00" saldria a las 2:00 de la manana hora local.
 */
export function proximaEjecucion(cron: string, desde: Date, offsetMinutos: number): Date | null {
  const f = parseCron(cron)
  if (!f) return null

  // Se razona en hora local moviendo el instante, y al final se deshace.
  const local = new Date(desde.getTime() + offsetMinutos * MIN)
  const cand = new Date(local.getTime())
  cand.setUTCSeconds(0, 0)
  cand.setUTCHours(f.hora, f.minuto)

  const avanzarDias = (d: number) => cand.setUTCDate(cand.getUTCDate() + d)

  if (f.tipo === 'diaria') {
    if (cand <= local) avanzarDias(1)
  } else if (f.tipo === 'semanal') {
    let delta = (f.diaSemana - cand.getUTCDay() + 7) % 7
    if (delta === 0 && cand <= local) delta = 7
    avanzarDias(delta)
  } else {
    cand.setUTCDate(f.diaMes)
    if (cand <= local) cand.setUTCMonth(cand.getUTCMonth() + 1, f.diaMes)
  }

  return new Date(cand.getTime() - offsetMinutos * MIN)
}

export function describirFrecuencia(cron: string): string {
  const f = parseCron(cron)
  if (!f) return cron
  const hh = `${String(f.hora).padStart(2, '0')}:${String(f.minuto).padStart(2, '0')}`
  if (f.tipo === 'diaria') return `Todos los días a las ${hh}`
  if (f.tipo === 'semanal') {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    return `Cada ${dias[f.diaSemana]} a las ${hh}`
  }
  return `El día ${f.diaMes} de cada mes a las ${hh}`
}

/**
 * Rango de fechas que cubre un informe programado, siempre cerrado: termina
 * ayer. Incluir el dia en curso daria una cifra parcial que el destinatario
 * comparara sin saberlo contra periodos completos.
 */
export function periodoDeEnvio(cron: string, ahora: Date): { from: string; to: string } | null {
  const f = parseCron(cron)
  if (!f) return null
  const DIA = 86_400_000
  const fin = new Date(ahora.getTime() - DIA)
  const dias = f.tipo === 'diaria' ? 1 : f.tipo === 'semanal' ? 7 : 30
  const inicio = new Date(fin.getTime() - (dias - 1) * DIA)
  return {
    from: `${inicio.toISOString().slice(0, 10)}T00:00:00.000Z`,
    to: `${fin.toISOString().slice(0, 10)}T23:59:59.999Z`,
  }
}
