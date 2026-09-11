import { localDayRange, localHourAndDow } from '@/lib/tz'
import type { getDb } from '@/lib/db'

type Db = ReturnType<typeof getDb>

/**
 * "Mi día" del empleado: llegada, salida, tiempo productivo, eficacia, barra
 * horaria, aplicaciones por clase y categorías.
 *
 * En modo día todo sale de activity_events. En semana y mes, traer los eventos
 * (30 000+ filas) no tiene sentido para una pantalla que se abre a diario:
 * se usan daily_user_metrics, que ya están agregadas, y la barra pasa a ser
 * por día en vez de por hora.
 */

export type Modo = 'dia' | 'semana' | 'mes'

export interface MyDayInput {
  /** YYYY-MM-DD en la zona de la empresa; ancla del período. */
  date: string
  modo: Modo
}

type Clase = 'productive' | 'non_productive' | 'neutral'
const VENTANA_EN_CURSO_MS = 15 * 60_000

function clase(p: string | null | undefined): Clase {
  return p === 'productive' || p === 'non_productive' ? p : 'neutral'
}

function masDias(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Lunes de la semana de `date` (ISO: la semana empieza en lunes). */
function lunesDe(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  const dow = d.getUTCDay()
  return masDias(date, dow === 0 ? -6 : 1 - dow)
}

export function rangoDe(date: string, modo: Modo): { desde: string; hasta: string } {
  if (modo === 'dia') return { desde: date, hasta: date }
  if (modo === 'semana') {
    const lunes = lunesDe(date)
    return { desde: lunes, hasta: masDias(lunes, 6) }
  }
  const primero = `${date.slice(0, 7)}-01`
  const d = new Date(`${primero}T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + 1, 0)
  return { desde: primero, hasta: d.toISOString().slice(0, 10) }
}

async function todas<T>(
  total: () => PromiseLike<{ count: number | null; error: unknown }>,
  consulta: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const PAGINA = 1000
  const { count, error } = await total()
  if (error) throw new Error(String((error as { message?: string }).message ?? error))
  const partes = await Promise.all(
    Array.from({ length: Math.ceil((count ?? 0) / PAGINA) }, (_, i) =>
      consulta(i * PAGINA, (i + 1) * PAGINA - 1),
    ),
  )
  const out: T[] = []
  for (const p of partes) {
    if (p.error) throw new Error(String((p.error as { message?: string }).message ?? p.error))
    out.push(...(p.data ?? []))
  }
  return out
}

export interface App {
  name: string
  seconds: number
}
export interface Categoria {
  name: string
  seconds: number
}

export async function buildMyDay(
  db: Db,
  tenantId: string,
  userId: string,
  timeZone: string,
  input: MyDayInput,
) {
  const { desde, hasta } = rangoDe(input.date, input.modo)
  const from = localDayRange(desde, timeZone).from
  const to = localDayRange(hasta, timeZone).to
  const ahora = Date.now()
  const incluyeHoy = ahora >= Date.parse(from) && ahora < Date.parse(to)

  // Catálogo: clase y categoría por identificador. Los eventos ya traen la
  // clase; la categoría (ofimática, correo, redes...) solo vive aquí.
  const { data: catalogo } = await db
    .from('app_catalog')
    .select('identifier, category, productivity')
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  const categoriaDe = new Map<string, string>()
  const claseCatalogo = new Map<string, Clase>()
  for (const c of catalogo ?? []) {
    const k = c.identifier.toLowerCase()
    if (c.category) categoriaDe.set(k, c.category)
    claseCatalogo.set(k, clase(c.productivity))
  }

  // ── Sparklines: 7 períodos que terminan en el actual ──
  const periodos: { desde: string; hasta: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const ancla =
      input.modo === 'dia'
        ? masDias(input.date, -i)
        : input.modo === 'semana'
          ? masDias(lunesDe(input.date), -7 * i)
          : (() => {
              const d = new Date(`${input.date.slice(0, 7)}-01T12:00:00Z`)
              d.setUTCMonth(d.getUTCMonth() - i)
              return d.toISOString().slice(0, 10)
            })()
    periodos.push(rangoDe(ancla, input.modo))
  }
  const sparkDesde = periodos[0]!.desde

  const [metricas, sesiones, entradas] = await Promise.all([
    db
      .from('daily_user_metrics')
      .select('metric_date, active_seconds, productive_seconds, non_productive_seconds, apps_top')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .gte('metric_date', sparkDesde)
      .lte('metric_date', hasta)
      .then((r) => r.data ?? []),
    db
      .from('work_sessions')
      .select('started_at, ended_at')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .gte('started_at', localDayRange(sparkDesde, timeZone).from)
      .lt('started_at', to)
      .order('started_at', { ascending: true })
      .then((r) => r.data ?? []),
    db
      .from('project_time_entries')
      .select('started_at, duration_seconds')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .gte('started_at', localDayRange(sparkDesde, timeZone).from)
      .lt('started_at', to)
      .then((r) => r.data ?? []),
  ])

  // ── Período actual ──
  let porHora = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    productive: 0,
    nonProductive: 0,
    neutral: 0,
  }))
  let porDia: { date: string; productive: number; nonProductive: number; neutral: number }[] = []
  const porApp = new Map<string, { clase: Clase; secs: number }>()
  let prod = 0
  let noProd = 0
  let neutro = 0
  let llegada: string | null = null
  let salida: string | null = null

  if (input.modo === 'dia') {
    const eventos = await todas<{
      started_at: string
      duration_seconds: number | null
      productivity: string | null
      app_identifier: string | null
    }>(
      () =>
        db
          .from('activity_events')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('user_id', userId)
          .gte('started_at', from)
          .lt('started_at', to),
      (a, b) =>
        db
          .from('activity_events')
          .select('started_at, duration_seconds, productivity, app_identifier')
          .eq('tenant_id', tenantId)
          .eq('user_id', userId)
          .gte('started_at', from)
          .lt('started_at', to)
          .order('started_at', { ascending: true })
          .range(a, b),
    )
    for (const e of eventos) {
      const secs = e.duration_seconds ?? 0
      const c = clase(e.productivity)
      const h = porHora[localHourAndDow(e.started_at, timeZone).hour]!
      if (c === 'productive') ((h.productive += secs), (prod += secs))
      else if (c === 'non_productive') ((h.nonProductive += secs), (noProd += secs))
      else ((h.neutral += secs), (neutro += secs))
      if (!llegada || e.started_at < llegada) llegada = e.started_at
      if (!salida || e.started_at > salida) salida = e.started_at
      if (e.app_identifier) {
        const a = porApp.get(e.app_identifier) ?? { clase: c, secs: 0 }
        a.secs += secs
        porApp.set(e.app_identifier, a)
      }
    }
  } else {
    // Semana/mes desde las métricas diarias; apps desde apps_top con la clase
    // del catálogo (apps_top no la guarda).
    const filas = metricas.filter((m) => m.metric_date >= desde && m.metric_date <= hasta)
    for (let d = desde; d <= hasta; d = masDias(d, 1)) {
      const m = filas.find((x) => x.metric_date === d)
      const p = m?.productive_seconds ?? 0
      const np = m?.non_productive_seconds ?? 0
      const n = Math.max((m?.active_seconds ?? 0) - p - np, 0)
      porDia.push({ date: d, productive: p, nonProductive: np, neutral: n })
      prod += p
      noProd += np
      neutro += n
      for (const a of (m?.apps_top ?? []) as { name?: string; secs?: number }[]) {
        if (!a.name) continue
        const x = porApp.get(a.name) ?? {
          clase: claseCatalogo.get(a.name.toLowerCase()) ?? 'neutral',
          secs: 0,
        }
        x.secs += a.secs ?? 0
        porApp.set(a.name, x)
      }
    }
    porHora = []
  }

  const total = prod + noProd + neutro

  // ── Llegada y salida ──
  // En modo día vienen de los eventos. En semana/mes es el promedio de las
  // primeras y últimas sesiones de cada día con actividad.
  const minutosLocales = (iso: string) => {
    const { hour } = localHourAndDow(iso, timeZone)
    const min = new Date(iso).getUTCMinutes() // el desfase de Colombia es en horas enteras
    return hour * 60 + min
  }
  const hhmm = (min: number | null) =>
    min === null
      ? null
      : `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`

  const llegadaSalidaDe = (
    d1: string,
    d2: string,
  ): { llegada: number | null; salida: number | null } => {
    const primeras: number[] = []
    const ultimas: number[] = []
    for (let d = d1; d <= d2; d = masDias(d, 1)) {
      const r = localDayRange(d, timeZone)
      const delDia = sesiones.filter((s) => s.started_at >= r.from && s.started_at < r.to)
      if (!delDia.length) continue
      primeras.push(minutosLocales(delDia[0]!.started_at))
      const fin = delDia.map((s) => s.ended_at).filter(Boolean) as string[]
      if (fin.length) ultimas.push(minutosLocales(fin.sort()[fin.length - 1]!))
    }
    const prom = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
    return { llegada: prom(primeras), salida: prom(ultimas) }
  }

  let llegadaTxt: string | null
  let salidaTxt: string | null
  let enCurso = false
  if (input.modo === 'dia') {
    llegadaTxt = llegada ? hhmm(minutosLocales(llegada)) : null
    enCurso = incluyeHoy && !!salida && ahora - Date.parse(salida) <= VENTANA_EN_CURSO_MS
    salidaTxt = salida && !enCurso ? hhmm(minutosLocales(salida)) : null
  } else {
    const ls = llegadaSalidaDe(desde, hasta)
    llegadaTxt = hhmm(ls.llegada)
    salidaTxt = hhmm(ls.salida)
  }

  const tiempoEnTrabajo =
    input.modo === 'dia' && llegada && salida
      ? Math.max(Math.round((Date.parse(salida) - Date.parse(llegada)) / 1000), total)
      : null

  const proyectos = entradas
    .filter((e) => e.started_at >= from && e.started_at < to)
    .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)

  // ── Sparklines ──
  const spark = {
    arrival: [] as (number | null)[],
    departure: [] as (number | null)[],
    productive: [] as number[],
    tracked: [] as number[],
    efficacy: [] as (number | null)[],
    productivity: [] as (number | null)[],
    projects: [] as number[],
  }
  for (const p of periodos) {
    const filas = metricas.filter((m) => m.metric_date >= p.desde && m.metric_date <= p.hasta)
    const a = filas.reduce((s, m) => s + (m.active_seconds ?? 0), 0)
    const pr = filas.reduce((s, m) => s + (m.productive_seconds ?? 0), 0)
    const np = filas.reduce((s, m) => s + (m.non_productive_seconds ?? 0), 0)
    spark.productive.push(pr)
    spark.tracked.push(a)
    spark.productivity.push(a > 0 ? Math.round((pr / a) * 100) : null)
    spark.efficacy.push(pr + np > 0 ? Math.round((pr / (pr + np)) * 100) : null)
    const ls = llegadaSalidaDe(p.desde, p.hasta)
    spark.arrival.push(ls.llegada)
    spark.departure.push(ls.salida)
    const r1 = localDayRange(p.desde, timeZone).from
    const r2 = localDayRange(p.hasta, timeZone).to
    spark.projects.push(
      entradas
        .filter((e) => e.started_at >= r1 && e.started_at < r2)
        .reduce((s, e) => s + (e.duration_seconds ?? 0), 0),
    )
  }

  // ── Apps y categorías ──
  const apps = { productive: [] as App[], nonProductive: [] as App[], neutral: [] as App[] }
  const porCategoria = new Map<string, number>()
  for (const [name, a] of porApp) {
    const item = { name, seconds: a.secs }
    if (a.clase === 'productive') apps.productive.push(item)
    else if (a.clase === 'non_productive') apps.nonProductive.push(item)
    else apps.neutral.push(item)
    const cat = categoriaDe.get(name.toLowerCase()) ?? 'Sin categoría'
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + a.secs)
  }
  const columna = (lista: App[]) => {
    lista.sort((x, y) => y.seconds - x.seconds)
    return {
      total: lista.reduce((s, x) => s + x.seconds, 0),
      count: lista.length,
      top: lista.slice(0, 8),
    }
  }
  const categorias: Categoria[] = [...porCategoria]
    .map(([name, seconds]) => ({ name, seconds }))
    .sort((x, y) => y.seconds - x.seconds)

  return {
    modo: input.modo,
    from: desde,
    to: hasta,
    includesToday: incluyeHoy,
    hasData: total > 0,
    kpis: {
      arrival: llegadaTxt,
      departure: salidaTxt,
      inProgress: enCurso,
      productiveSecs: prod,
      trackedSecs: total,
      atWorkSecs: tiempoEnTrabajo,
      projectSecs: proyectos,
      efficacyPct: prod + noProd > 0 ? Math.round((prod / (prod + noProd)) * 100) : null,
      productivityPct: total > 0 ? Math.round((prod / total) * 100) : null,
    },
    sparklines: spark,
    hourly: porHora,
    daily: porDia,
    apps: {
      productive: columna(apps.productive),
      nonProductive: columna(apps.nonProductive),
      neutral: columna(apps.neutral),
    },
    categories: categorias,
  }
}
