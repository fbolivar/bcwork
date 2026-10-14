import type { getDb } from '@/lib/db'

type Db = ReturnType<typeof getDb>

/**
 * Auto-verificación de coherencia.
 *
 * Red de seguridad: antes de que un administrador (o un cliente) vea una
 * incoherencia en pantalla, la app se revisa a sí misma y avisa. No mide
 * comportamiento de personas: valida que los NÚMEROS que calculamos sean
 * internamente consistentes (sin jornadas de más de 24 h, el tiempo activo no
 * excede la jornada, la clasificación suma, nadie encabeza a la vez productivo
 * e improductivo, y los agentes están reportando).
 *
 * Todo sale de work_day_blocks (misma fuente que el panel) para que lo que se
 * verifica sea exactamente lo que se muestra.
 */

export type Estado = 'ok' | 'alerta' | 'falla'

export interface Muestra {
  etiqueta: string
  detalle: string
}

export interface Chequeo {
  id: string
  titulo: string
  /** Qué invariante valida, en una frase para no técnicos. */
  descripcion: string
  estado: Estado
  resumen: string
  muestras: Muestra[]
}

export interface Coherencia {
  days: number
  rangeLabel: string
  generatedAt: string
  people: number
  dayRows: number
  estadoGeneral: Estado
  checks: Chequeo[]
}

export interface CoherenciaInput {
  /** Ventana hacia atrás en días (1–31). */
  days?: number
}

interface Bloque {
  user_id: string
  day: string
  productive: number
  non_productive: number
  neutral: number
  active_seconds: number
  worked_seconds: number
  idle_seconds: number
}

const DIA_SEG = 24 * 3600

function horas(s: number): string {
  return `${(s / 3600).toFixed(1)} h`
}

function peor(estados: Estado[]): Estado {
  if (estados.includes('falla')) return 'falla'
  if (estados.includes('alerta')) return 'alerta'
  return 'ok'
}

export async function buildCoherencia(
  db: Db,
  tenantId: string,
  timeZone: string,
  input: CoherenciaInput,
): Promise<Coherencia> {
  const days = Math.min(31, Math.max(1, Math.round(input.days ?? 7)))
  const to = new Date()
  const from = new Date(to.getTime() - days * DIA_SEG * 1000)

  const { data: usuarios, error: uErr } = await db
    .from('users')
    .select('id, full_name, email')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
  if (uErr) throw new Error(uErr.message)
  const personas = (usuarios ?? []) as { id: string; full_name: string | null; email: string }[]
  const nombre = new Map(personas.map((u) => [u.id, u.full_name || u.email]))
  const ids = personas.map((u) => u.id)

  const checks: Chequeo[] = []
  const base: Coherencia = {
    days,
    rangeLabel: `${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`,
    generatedAt: new Date().toISOString(),
    people: personas.length,
    dayRows: 0,
    estadoGeneral: 'ok',
    checks,
  }
  if (ids.length === 0) {
    checks.push({
      id: 'sin-personas',
      titulo: 'Personas activas',
      descripcion: 'Debe haber al menos una persona activa para verificar.',
      estado: 'alerta',
      resumen: 'No hay personas activas en la empresa.',
      muestras: [],
    })
    base.estadoGeneral = 'alerta'
    return base
  }

  const { data: cfg } = await db
    .from('tenants')
    .select('work_gap_minutes')
    .eq('id', tenantId)
    .maybeSingle()
  const gapMin = (cfg as { work_gap_minutes?: number } | null)?.work_gap_minutes ?? 30

  const rpc = db as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
  }
  const [bloquesR, { data: devices }] = await Promise.all([
    rpc.rpc('work_day_blocks', {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_user_ids: ids,
      p_gap_minutes: gapMin,
      p_tz: timeZone,
    }),
    db
      .from('agent_devices')
      .select('hostname, name, user_id, last_seen_at')
      .eq('tenant_id', tenantId)
      .is('revoked_at', null),
  ])
  if (bloquesR.error) throw new Error(bloquesR.error.message)
  const bloques = (bloquesR.data ?? []) as Bloque[]
  base.dayRows = bloques.length

  // ── 1) Jornadas imposibles (> 24 h en un día) ──
  // Dispara con doble conteo de agentes: un día nunca tiene más de 24 h.
  const imposibles = bloques.filter((b) => b.worked_seconds > DIA_SEG || b.active_seconds > DIA_SEG)
  checks.push({
    id: 'jornadas-imposibles',
    titulo: 'Jornadas dentro de las 24 h',
    descripcion: 'Ninguna persona puede tener más de 24 h de jornada o actividad en un mismo día.',
    estado: imposibles.length > 0 ? 'falla' : 'ok',
    resumen:
      imposibles.length > 0
        ? `${imposibles.length} de ${bloques.length} jornadas superan las 24 h (posible doble conteo).`
        : `0 de ${bloques.length} jornadas superan las 24 h.`,
    muestras: imposibles.slice(0, 10).map((b) => ({
      etiqueta: `${nombre.get(b.user_id) ?? b.user_id} · ${b.day}`,
      detalle: `jornada ${horas(b.worked_seconds)}, activo ${horas(b.active_seconds)}`,
    })),
  })

  // ── 2) Tiempo activo ≤ jornada ──
  // El tiempo con interacción no puede exceder el ancho de los bloques.
  const TOL = 5
  const activoMayor = bloques.filter((b) => b.active_seconds > b.worked_seconds + TOL)
  checks.push({
    id: 'activo-vs-jornada',
    titulo: 'Tiempo activo no excede la jornada',
    descripcion: 'El tiempo con interacción debe ser menor o igual al ancho de la jornada.',
    estado: activoMayor.length > 0 ? 'falla' : 'ok',
    resumen:
      activoMayor.length > 0
        ? `${activoMayor.length} jornadas con tiempo activo mayor que la jornada.`
        : `Consistente en las ${bloques.length} jornadas.`,
    muestras: activoMayor.slice(0, 10).map((b) => ({
      etiqueta: `${nombre.get(b.user_id) ?? b.user_id} · ${b.day}`,
      detalle: `activo ${horas(b.active_seconds)} > jornada ${horas(b.worked_seconds)}`,
    })),
  })

  // ── 3) La clasificación suma ──
  // productivo + improductivo + neutral debe aproximar el tiempo activo.
  const descuadre = bloques.filter((b) => {
    const suma = b.productive + b.non_productive + b.neutral
    const margen = Math.max(5, b.active_seconds * 0.01)
    return Math.abs(suma - b.active_seconds) > margen
  })
  checks.push({
    id: 'clasificacion-suma',
    titulo: 'La clasificación cuadra con el tiempo activo',
    descripcion:
      'Productivo + improductivo + neutral debe sumar (casi exacto) el tiempo activo del día.',
    estado: descuadre.length > 0 ? 'alerta' : 'ok',
    resumen:
      descuadre.length > 0
        ? `${descuadre.length} jornadas donde las clases no suman el tiempo activo.`
        : `Las clases suman correctamente en las ${bloques.length} jornadas.`,
    muestras: descuadre.slice(0, 10).map((b) => ({
      etiqueta: `${nombre.get(b.user_id) ?? b.user_id} · ${b.day}`,
      detalle: `clases ${horas(b.productive + b.non_productive + b.neutral)} vs activo ${horas(b.active_seconds)}`,
    })),
  })

  // ── 4) Rankings disjuntos ──
  // Agrego por persona y construyo top por TASA (no por tiempo absoluto, que fue
  // el bug que generaba incoherencia). Nadie debería encabezar ambos a la vez.
  const agg = new Map<string, { p: number; np: number; active: number }>()
  for (const b of bloques) {
    const a = agg.get(b.user_id) ?? { p: 0, np: 0, active: 0 }
    a.p += b.productive
    a.np += b.non_productive
    a.active += b.active_seconds
    agg.set(b.user_id, a)
  }
  const MIN_ACTIVO = 3600 // al menos 1 h de actividad para rankear
  const rankeables = [...agg.entries()]
    .filter(([, a]) => a.active >= MIN_ACTIVO)
    .map(([uid, a]) => ({
      uid,
      prodPct: a.active > 0 ? (a.p / a.active) * 100 : 0,
      npPct: a.active > 0 ? (a.np / a.active) * 100 : 0,
    }))
  const topProd = new Set(
    [...rankeables]
      .sort((x, y) => y.prodPct - x.prodPct)
      .slice(0, 3)
      .map((x) => x.uid),
  )
  const topImprod = new Set(
    [...rankeables]
      .sort((x, y) => y.npPct - x.npPct)
      .slice(0, 3)
      .map((x) => x.uid),
  )
  const enAmbos = [...topProd].filter((uid) => topImprod.has(uid))
  checks.push({
    id: 'rankings-disjuntos',
    titulo: 'Rankings coherentes',
    descripcion: 'Nadie debería encabezar a la vez "más productivo" y "más improductivo".',
    estado: enAmbos.length > 0 ? 'alerta' : 'ok',
    resumen:
      enAmbos.length > 0
        ? `${enAmbos.length} persona(s) aparecen en el top de ambos rankings.`
        : `Los tops de productivo e improductivo no se cruzan (${rankeables.length} rankeables).`,
    muestras: enAmbos.slice(0, 10).map((uid) => {
      const r = rankeables.find((x) => x.uid === uid)!
      return {
        etiqueta: nombre.get(uid) ?? uid,
        detalle: `productivo ${r.prodPct.toFixed(0)} % y improductivo ${r.npPct.toFixed(0)} %`,
      }
    }),
  })

  // ── 5) Cobertura de datos ──
  const conDatos = new Set(bloques.filter((b) => b.active_seconds > 0).map((b) => b.user_id))
  const sinDatos = personas.filter((u) => !conDatos.has(u.id))
  const coberturaPct = personas.length > 0 ? (conDatos.size / personas.length) * 100 : 0
  const estadoCob: Estado = coberturaPct >= 80 ? 'ok' : coberturaPct >= 50 ? 'alerta' : 'falla'
  checks.push({
    id: 'cobertura',
    titulo: 'Cobertura de datos',
    descripcion: `Qué porcentaje de las personas activas reportó actividad en los últimos ${days} días.`,
    estado: estadoCob,
    resumen: `${coberturaPct.toFixed(0)} % (${conDatos.size} de ${personas.length}) con datos.`,
    muestras: sinDatos.slice(0, 10).map((u) => ({
      etiqueta: u.full_name || u.email,
      detalle: 'sin actividad en la ventana — revisar agente',
    })),
  })

  // ── 6) Agentes reportando (frescura) ──
  const equipos = (devices ?? []) as {
    hostname: string | null
    name: string | null
    user_id: string | null
    last_seen_at: string | null
  }[]
  const limite = Date.now() - 24 * 3600 * 1000
  const stale = equipos.filter((d) => !d.last_seen_at || Date.parse(d.last_seen_at) < limite)
  checks.push({
    id: 'agentes-frescos',
    titulo: 'Agentes reportando',
    descripcion: 'Los agentes instalados deben haber reportado en las últimas 24 h.',
    estado: stale.length === 0 ? 'ok' : stale.length <= 2 ? 'alerta' : 'falla',
    resumen:
      stale.length === 0
        ? `Los ${equipos.length} agentes reportaron en las últimas 24 h.`
        : `${stale.length} de ${equipos.length} agentes llevan más de 24 h sin reportar.`,
    muestras: stale.slice(0, 10).map((d) => ({
      etiqueta:
        (d.user_id ? nombre.get(d.user_id) : null) || d.name || d.hostname || 'equipo sin nombre',
      detalle: d.last_seen_at
        ? `último reporte ${new Date(d.last_seen_at).toLocaleString('es-CO')}`
        : 'nunca reportó',
    })),
  })

  base.estadoGeneral = peor(checks.map((c) => c.estado))
  return base
}
