/**
 * Jornada máxima legal en Colombia — Ley 2101 de 2021.
 *
 * La ley reduce la jornada ordinaria por etapas. El producto compara el
 * cumplimiento contra el horario que cada empresa configura, así que si ese
 * horario supera el máximo vigente, todos los porcentajes se miden contra una
 * jornada que la ley ya no permite.
 *
 * Las tres empresas del piloto tenían 47 h configuradas en septiembre de 2026,
 * cuando el tope vigente es 42.
 *
 * OJO: esto es una tabla de referencia para avisar en la interfaz, no un
 * concepto jurídico. Antes de bloquear nada por este valor, que lo confirme un
 * abogado.
 */

export type EtapaJornada = { desde: string; horas: number }

/** Escalonamiento de la Ley 2101: fecha de entrada en vigor → horas semanales. */
export const ETAPAS_JORNADA_CO: EtapaJornada[] = [
  { desde: '2021-07-15', horas: 48 },
  { desde: '2023-07-15', horas: 47 },
  { desde: '2024-07-15', horas: 46 },
  { desde: '2025-07-15', horas: 44 },
  { desde: '2026-07-15', horas: 42 },
]

/** Máximo legal de horas semanales vigente en la fecha dada. */
export function jornadaMaximaSemanal(at: Date = new Date()): number {
  const iso = at.toISOString().slice(0, 10)
  let horas = ETAPAS_JORNADA_CO[0]!.horas
  for (const e of ETAPAS_JORNADA_CO) {
    if (iso >= e.desde) horas = e.horas
  }
  return horas
}

/** Cuántas horas semanales excede un horario configurado. 0 si está dentro. */
export function excesoJornada(horasSemanales: number, at: Date = new Date()): number {
  return Math.max(0, horasSemanales - jornadaMaximaSemanal(at))
}
