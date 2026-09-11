import { localDayRange, localHourAndDow, localMidnightUtc } from '@/lib/tz'
import type { getDb } from '@/lib/db'

type Db = ReturnType<typeof getDb>

/**
 * Panel del día: lo que un administrador mira al abrir BCWork.
 *
 * Todo sale de activity_events del día en la zona horaria de la empresa. La
 * hora de llegada se toma del primer evento y no de work_sessions, porque las
 * sesiones no cierran a medianoche en equipos que nunca se apagan y una
 * "sesión de hoy" puede haber empezado el martes.
 */

export interface DayOverviewInput {
  /** YYYY-MM-DD en la zona de la empresa. */
  date: string
  /** Nombre de departamento, `__none__` para "sin departamento", vacío = todos. */
  department?: string
}

type Clase = 'productive' | 'non_productive' | 'neutral'

const VENTANA_AHORA_MS = 15 * 60_000
const DIAS_SPARKLINE = 7

function clase(p: string | null): Clase {
  return p === 'productive' || p === 'non_productive' ? p : 'neutral'
}

/**
 * PostgREST corta en 1000 filas y un día de ocho personas ya pasa de eso. Se
 * pide el total primero y las páginas van en paralelo: en serie, seis páginas
 * eran tres segundos de espera para abrir el panel.
 */
async function todas<T>(
  total: () => PromiseLike<{ count: number | null; error: unknown }>,
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const PAGINA = 1000
  const { count, error } = await total()
  if (error) throw new Error(String((error as { message?: string }).message ?? error))
  const paginas = Math.ceil((count ?? 0) / PAGINA)
  const partes = await Promise.all(
    Array.from({ length: paginas }, (_, i) => consulta(i * PAGINA, (i + 1) * PAGINA - 1)),
  )
  const out: T[] = []
  for (const p of partes) {
    if (p.error) throw new Error(String((p.error as { message?: string }).message ?? p.error))
    out.push(...(p.data ?? []))
  }
  return out
}

function minutosDeHora(hhmm: string | null): number | null {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (h === undefined || Number.isNaN(h)) return null
  return h * 60 + (m ?? 0)
}

function fechaMasDias(date: string, dias: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export async function buildDayOverview(
  db: Db,
  tenantId: string,
  timeZone: string,
  input: DayOverviewInput,
) {
  const { date } = input
  const { from, to } = localDayRange(date, timeZone)
  const ahora = Date.now()
  const esHoy = ahora >= Date.parse(from) && ahora < Date.parse(to)

  // ── Personas ──
  const { data: usuariosTodos, error: uErr } = await db
    .from('users')
    .select('id, full_name, email, department, role, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .in('role', ['employee', 'manager'])
  if (uErr) throw new Error(uErr.message)

  const departamentos = [
    ...new Set((usuariosTodos ?? []).map((u) => u.department).filter(Boolean) as string[]),
  ].sort((a, b) => a.localeCompare(b, 'es'))
  const haySinDepartamento = (usuariosTodos ?? []).some((u) => !u.department)

  const usuarios = (usuariosTodos ?? []).filter((u) => {
    if (!input.department) return true
    if (input.department === '__none__') return !u.department
    return u.department === input.department
  })
  const ids = usuarios.map((u) => u.id)
  const nombre = new Map(usuarios.map((u) => [u.id, u.full_name || u.email]))

  const vacio = {
    date,
    isToday: esHoy,
    departments: departamentos,
    hasNoDepartment: haySinDepartamento,
    people: 0,
  }
  if (ids.length === 0) {
    return {
      ...vacio,
      hourly: [] as { hour: number; productive: number; nonProductive: number; neutral: number }[],
      kpis: {
        productivityPct: null as number | null,
        arrived: 0,
        late: 0,
        absent: 0,
        productiveNow: 0,
        slackingNow: 0,
      },
      sparklines: {
        productivityPct: [] as (number | null)[],
        arrived: [] as number[],
        absent: [] as number[],
        late: [] as number[],
      },
      rankings: {
        mostProductive: [] as Persona[],
        mostUnproductive: [] as Persona[],
        mostEffective: [] as Persona[],
        mostIdle: [] as Persona[],
        late: [] as Persona[],
        absent: [] as Persona[],
      },
      apps: {
        productive: { total: 0, count: 0, top: [] as App[] },
        nonProductive: { total: 0, count: 0, top: [] as App[] },
        neutral: { total: 0, count: 0, top: [] as App[] },
      },
    }
  }

  // ── Horarios vigentes ──
  const { data: asignaciones } = await db
    .from('user_schedules')
    .select(
      'user_id, effective_from, effective_to, work_schedules(start_time, days_of_week, flex_minutes)',
    )
    .eq('tenant_id', tenantId)
    .in('user_id', ids)
    .lte('effective_from', date)
  const horario = new Map<
    string,
    { inicioMin: number | null; dias: number[] | null; flex: number }
  >()
  for (const a of (asignaciones ?? []) as any[]) {
    if (a.effective_to && a.effective_to < date) continue
    const ws = a.work_schedules
    if (!ws) continue
    horario.set(a.user_id, {
      inicioMin: minutosDeHora(ws.start_time),
      dias: ws.days_of_week,
      flex: ws.flex_minutes ?? 0,
    })
  }
  // Alguien dado de alta después de la fecha consultada no podía estar: mirar
  // el 10 de septiembre no debe marcar ausentes a los cinco que entraron el 11.
  const creado = new Map(usuarios.map((u) => [u.id, u.created_at ?? '']))
  const existiaEl = (uid: string, dia: string) => (creado.get(uid) ?? '') < `${dia}T99`
  const esperado = (uid: string, dia: string, dow: number) => {
    if (!existiaEl(uid, dia)) return false
    const h = horario.get(uid)
    if (h?.dias?.length) return h.dias.includes(dow)
    return dow >= 1 && dow <= 5 // sin horario: lunes a viernes
  }
  const dowHoy = localHourAndDow(from, timeZone).dow
  const debeTrabajar = (uid: string) => esperado(uid, date, dowHoy)

  // ── Consultas independientes, todas a la vez ──
  const desdeSpark = fechaMasDias(date, -(DIAS_SPARKLINE - 1))
  const pEventos = todas<{
    user_id: string
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
        .in('user_id', ids)
        .gte('started_at', from)
        .lt('started_at', to),
    (a, b) =>
      db
        .from('activity_events')
        .select('user_id, started_at, duration_seconds, productivity, app_identifier')
        .eq('tenant_id', tenantId)
        .in('user_id', ids)
        .gte('started_at', from)
        .lt('started_at', to)
        .order('started_at', { ascending: true })
        .range(a, b),
  )
  const pSesiones = db
    .from('work_sessions')
    .select('user_id, idle_seconds')
    .eq('tenant_id', tenantId)
    .in('user_id', ids)
    .gte('started_at', from)
    .lt('started_at', to)
  const pMetricas = db
    .from('daily_user_metrics')
    .select('metric_date, user_id, active_seconds, productive_seconds')
    .eq('tenant_id', tenantId)
    .in('user_id', ids)
    .gte('metric_date', desdeSpark)
    .lte('metric_date', date)
  const pSesiones7 = db
    .from('work_sessions')
    .select('user_id, started_at')
    .eq('tenant_id', tenantId)
    .in('user_id', ids)
    .gte('started_at', localDayRange(desdeSpark, timeZone).from)
    .lt('started_at', to)
    .order('started_at', { ascending: true })

  const [eventos, { data: sesiones }, { data: metricas }, { data: sesiones7 }] = await Promise.all([
    pEventos,
    pSesiones,
    pMetricas,
    pSesiones7,
  ])

  // ── Agregados ──
  const porHora = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    productive: 0,
    nonProductive: 0,
    neutral: 0,
  }))
  const porPersona = new Map<
    string,
    {
      prod: number
      noProd: number
      neutro: number
      llegada: string
      ultimo: string
      ultimaClase: Clase
    }
  >()
  const porApp = new Map<string, { clase: Clase; secs: number }>()

  for (const e of eventos) {
    const secs = e.duration_seconds ?? 0
    const c = clase(e.productivity)
    const h = localHourAndDow(e.started_at, timeZone).hour
    const fila = porHora[h]!
    if (c === 'productive') fila.productive += secs
    else if (c === 'non_productive') fila.nonProductive += secs
    else fila.neutral += secs

    const p = porPersona.get(e.user_id) ?? {
      prod: 0,
      noProd: 0,
      neutro: 0,
      llegada: e.started_at,
      ultimo: e.started_at,
      ultimaClase: c,
    }
    if (c === 'productive') p.prod += secs
    else if (c === 'non_productive') p.noProd += secs
    else p.neutro += secs
    if (e.started_at < p.llegada) p.llegada = e.started_at
    if (e.started_at >= p.ultimo) {
      p.ultimo = e.started_at
      p.ultimaClase = c
    }
    porPersona.set(e.user_id, p)

    if (e.app_identifier) {
      const a = porApp.get(e.app_identifier) ?? { clase: c, secs: 0 }
      a.secs += secs
      porApp.set(e.app_identifier, a)
    }
  }

  // ── Inactividad: sesiones que empezaron hoy ──
  const inactivo = new Map<string, number>()
  for (const s of sesiones ?? []) {
    inactivo.set(s.user_id, (inactivo.get(s.user_id) ?? 0) + (s.idle_seconds ?? 0))
  }

  // ── Llegó / tarde / ausente ──
  const medianoche = localMidnightUtc(date, timeZone).getTime()
  const personas: Persona[] = usuarios.map((u) => {
    const p = porPersona.get(u.id)
    const h = horario.get(u.id)
    let minutosTarde: number | null = null
    if (p && h?.inicioMin !== null && h?.inicioMin !== undefined) {
      const llegadaMin = Math.round((Date.parse(p.llegada) - medianoche) / 60_000)
      const retraso = llegadaMin - h.inicioMin - h.flex
      minutosTarde = retraso > 0 ? retraso : 0
    }
    const total = (p?.prod ?? 0) + (p?.noProd ?? 0) + (p?.neutro ?? 0)
    return {
      userId: u.id,
      name: nombre.get(u.id) ?? '',
      department: u.department,
      arrived: !!p,
      arrivalAt: p?.llegada ?? null,
      lateMinutes: minutosTarde,
      absent: !p && debeTrabajar(u.id),
      productiveSecs: p?.prod ?? 0,
      nonProductiveSecs: p?.noProd ?? 0,
      neutralSecs: p?.neutro ?? 0,
      totalSecs: total,
      productivityPct: total > 0 ? Math.round(((p?.prod ?? 0) / total) * 100) : null,
      effectivenessPct:
        p && p.prod + p.noProd > 0 ? Math.round((p.prod / (p.prod + p.noProd)) * 100) : null,
      idleSecs: inactivo.get(u.id) ?? 0,
      nowClass:
        esHoy && p && ahora - Date.parse(p.ultimo) <= VENTANA_AHORA_MS ? p.ultimaClase : null,
    }
  })

  const totProd = personas.reduce((s, p) => s + p.productiveSecs, 0)
  const totTodo = personas.reduce((s, p) => s + p.totalSecs, 0)

  const top = (arr: Persona[], n = 5) => arr.slice(0, n)
  const conActividad = personas.filter((p) => p.totalSecs > 0)

  // ── Aplicaciones ──
  const apps = { productive: [] as App[], nonProductive: [] as App[], neutral: [] as App[] }
  for (const [name, a] of porApp) {
    const item = { name, seconds: a.secs }
    if (a.clase === 'productive') apps.productive.push(item)
    else if (a.clase === 'non_productive') apps.nonProductive.push(item)
    else apps.neutral.push(item)
  }
  const columna = (lista: App[]) => {
    lista.sort((a, b) => b.seconds - a.seconds)
    return {
      total: lista.reduce((s, a) => s + a.seconds, 0),
      count: lista.length,
      top: lista.slice(0, 5),
    }
  }

  // ── Sparklines: los 7 días que terminan en `date` ──

  const spark = {
    productivityPct: [] as (number | null)[],
    arrived: [] as number[],
    absent: [] as number[],
    late: [] as number[],
  }
  for (let i = 0; i < DIAS_SPARKLINE; i++) {
    const dia = fechaMasDias(desdeSpark, i)
    const filas = (metricas ?? []).filter((m) => m.metric_date === dia)
    const act = filas.reduce((s, m) => s + (m.active_seconds ?? 0), 0)
    const prod = filas.reduce((s, m) => s + (m.productive_seconds ?? 0), 0)
    spark.productivityPct.push(act > 0 ? Math.round((prod / act) * 100) : null)
    const llegaron = new Set(filas.filter((m) => (m.active_seconds ?? 0) > 0).map((m) => m.user_id))
    spark.arrived.push(llegaron.size)
    const dow = localHourAndDow(localDayRange(dia, timeZone).from, timeZone).dow
    const esperados = usuarios.filter((u) => esperado(u.id, dia, dow))
    spark.absent.push(esperados.filter((u) => !llegaron.has(u.id)).length)

    // Tarde: primera sesión del día contra el horario.
    const rango = localDayRange(dia, timeZone)
    const primera = new Map<string, string>()
    for (const s of sesiones7 ?? []) {
      if (s.started_at >= rango.from && s.started_at < rango.to && !primera.has(s.user_id)) {
        primera.set(s.user_id, s.started_at)
      }
    }
    const inicioDia = localMidnightUtc(dia, timeZone).getTime()
    let tarde = 0
    for (const [uid, inicio] of primera) {
      const h = horario.get(uid)
      if (h?.inicioMin === null || h?.inicioMin === undefined) continue
      if (Math.round((Date.parse(inicio) - inicioDia) / 60_000) - h.inicioMin - h.flex > 0) tarde++
    }
    spark.late.push(tarde)
  }

  return {
    ...vacio,
    people: personas.length,
    hourly: porHora,
    kpis: {
      productivityPct: totTodo > 0 ? Math.round((totProd / totTodo) * 100) : null,
      arrived: personas.filter((p) => p.arrived).length,
      late: personas.filter((p) => (p.lateMinutes ?? 0) > 0).length,
      absent: personas.filter((p) => p.absent).length,
      productiveNow: personas.filter((p) => p.nowClass === 'productive').length,
      slackingNow: personas.filter((p) => p.nowClass === 'non_productive').length,
    },
    sparklines: spark,
    rankings: {
      mostProductive: top([...conActividad].sort((a, b) => b.productiveSecs - a.productiveSecs)),
      mostUnproductive: top(
        [...conActividad]
          .filter((p) => p.nonProductiveSecs > 0)
          .sort((a, b) => b.nonProductiveSecs - a.nonProductiveSecs),
      ),
      mostEffective: top(
        [...conActividad]
          .filter((p) => p.effectivenessPct !== null)
          .sort((a, b) => (b.effectivenessPct ?? 0) - (a.effectivenessPct ?? 0)),
      ),
      mostIdle: top(
        [...personas].filter((p) => p.idleSecs > 0).sort((a, b) => b.idleSecs - a.idleSecs),
      ),
      late: top(
        personas
          .filter((p) => (p.lateMinutes ?? 0) > 0)
          .sort((a, b) => (b.lateMinutes ?? 0) - (a.lateMinutes ?? 0)),
      ),
      absent: top(
        personas.filter((p) => p.absent),
        10,
      ),
    },
    apps: {
      productive: columna(apps.productive),
      nonProductive: columna(apps.nonProductive),
      neutral: columna(apps.neutral),
    },
  }
}

export interface Persona {
  userId: string
  name: string
  department: string | null
  arrived: boolean
  arrivalAt: string | null
  lateMinutes: number | null
  absent: boolean
  productiveSecs: number
  nonProductiveSecs: number
  neutralSecs: number
  totalSecs: number
  productivityPct: number | null
  effectivenessPct: number | null
  idleSecs: number
  nowClass: Clase | null
}

export interface App {
  name: string
  seconds: number
}
