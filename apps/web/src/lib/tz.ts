/**
 * Límites de día y hora local por zona horaria del tenant.
 *
 * Los eventos se guardan en UTC. Recortar el día con `T00:00:00Z` desplaza la
 * jornada cinco horas en Colombia: lo trabajado entre 19:00 y 24:00 locales cae
 * en el día siguiente. Para un producto laboral eso no es un detalle estético —
 * la Ley 2191 (desconexión laboral) se juzga sobre la hora local del trabajador.
 */

/** Milisegundos que la hora local va por delante de UTC en ese instante. */
function offsetMs(at: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p = Object.fromEntries(
    dtf
      .formatToParts(at)
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, Number(x.value)]),
  ) as Record<string, number>

  const asUtc = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour! % 24, p.minute!, p.second!)
  return asUtc - at.getTime()
}

/** Instante UTC de la medianoche local de `date` (YYYY-MM-DD) en `timeZone`. */
export function localMidnightUtc(date: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const guess = Date.UTC(y!, m! - 1, d!)
  // Dos pasadas alcanzan: la primera corrige el grueso, la segunda el borde de
  // un eventual cambio de horario (Colombia no lo tiene, otros husos sí).
  let t = guess - offsetMs(new Date(guess), timeZone)
  t = guess - offsetMs(new Date(t), timeZone)
  return new Date(t)
}

/** Rango [desde, hasta) en ISO UTC que cubre el día local completo. */
export function localDayRange(date: string, timeZone: string): { from: string; to: string } {
  const from = localMidnightUtc(date, timeZone)
  const to = new Date(from.getTime() + 24 * 3600 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** Hora local (0-23) y día de la semana (0=domingo) de un instante. */
export function localHourAndDow(iso: string, timeZone: string): { hour: number; dow: number } {
  const at = new Date(iso)
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    weekday: 'short',
  })
  const parts = dtf.formatToParts(at)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd)
  return { hour, dow: dow < 0 ? 0 : dow }
}
