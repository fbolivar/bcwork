import { localDayRange, localHourAndDow, localMidnightUtc } from '@/lib/tz'
import type { getDb } from '@/lib/db'
import { cargarAusencias } from './ausencias'

type Db = ReturnType<typeof getDb>

/**
 * Analista IA — los hechos.
 *
 * Todo lo que el modelo va a interpretar se calcula aquí, de forma
 * determinista y a partir de los mismos agregados que usan los informes. El
 * modelo no ve eventos crudos ni títulos de ventana: ve, por persona, horas
 * al día, % productivo, puntualidad, ausencias, inactividad, trabajo fuera de
 * horario, en qué se va el tiempo y cómo cambió frente al periodo anterior.
 * Con eso puede razonar; sin eso alucina.
 *
 * Las señales (`signals`) también salen de reglas, no del modelo: así el
 * panel es útil aunque no haya clave de IA configurada, y lo que el modelo
 * diga se puede contrastar con un número.
 */

export type PeriodKey = '1h' | '24h' | '7d' | '30d' | '1y'

export interface AnalystInput {
  period: PeriodKey
}

/** Cada periodo: cuántos días abarca, cómo se agrupa la serie de tendencia y
 *  si es una ventana de menos de un día (foto instantánea, sin asistencia). */
const PERIODOS: Record<
  PeriodKey,
  { days: number; bucket: 'none' | 'day' | 'month'; subhour: boolean; label: string }
> = {
  '1h': { days: 1, bucket: 'none', subhour: true, label: 'la última hora' },
  '24h': { days: 1, bucket: 'none', subhour: false, label: 'las últimas 24 horas' },
  '7d': { days: 7, bucket: 'day', subhour: false, label: 'los últimos 7 días' },
  '30d': { days: 30, bucket: 'day', subhour: false, label: 'los últimos 30 días' },
  '1y': { days: 365, bucket: 'month', subhour: false, label: 'el último año' },
}

export type Severidad = 'alta' | 'media' | 'baja' | 'positiva'

export interface Senal {
  code: string
  severity: Severidad
  userId: string | null
  title: string
  detail: string
}

export interface PeriodoPersona {
  daysExpected: number
  daysActive: number
  activeHoursPerDay: number | null
  productivityPct: number | null
  effectivenessPct: number | null
  nonProductivePct: number | null
  idlePct: number | null
  lateDays: number
  avgLateMinutes: number | null
  absentDays: number
  leaveDays: number
  avgArrival: string | null
  avgEnd: string | null
  offHoursHours: number
  weekendHours: number
  daysAfter19: number
}

export interface PersonaHechos {
  userId: string
  name: string
  department: string | null
  role: string
  current: PeriodoPersona
  previous: PeriodoPersona
  weekly: { week: string; activeHoursPerDay: number | null; productivityPct: number | null }[]
  trend: {
    hours: 'sube' | 'baja' | 'estable' | null
    productivity: 'sube' | 'baja' | 'estable' | null
  }
  topApps: { name: string; productivity: string; hours: number }[]
  signals: Senal[]
}

export interface Hechos {
  company: string
  period: {
    from: string
    to: string
    previousFrom: string
    previousTo: string
    key: PeriodKey
    label: string
    rangeLabel: string
  }
  people: number
  totals: {
    current: PeriodoEmpresa
    previous: PeriodoEmpresa
  }
  departments: {
    name: string
    people: number
    activeHoursPerDay: number | null
    productivityPct: number | null
    deltaProductivityPp: number | null
  }[]
  weekly: {
    week: string
    activeHoursPerDay: number | null
    productivityPct: number | null
    latePct: number | null
  }[]
  /** Perfil de productividad por hora del día (para la gráfica del informe). */
  profile: { hour: number; productive: number; nonProductive: number; neutral: number }[]
  /** Aplicaciones más usadas y sitios web más consultados (toda la empresa). */
  apps: { name: string; productivity: string; hours: number }[]
  sites: { name: string; productivity: string; hours: number }[]
  signals: Senal[]
  persons: PersonaHechos[]
}

export interface PeriodoEmpresa {
  activeHoursPerDay: number | null
  productivityPct: number | null
  effectivenessPct: number | null
  idlePct: number | null
  latePct: number | null
  absentDays: number
  offHoursHours: number
  weekendHours: number
  peopleActive: number
}

interface UserDay {
  user_id: string
  day: string
  productive: number
  non_productive: number
  neutral: number
  worked_seconds: number
  idle_seconds: number
  first_at: string | null
  last_at: string | null
}

const H = 3600

function masDias(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function minutosDeHora(hhmm: string | null): number | null {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h === undefined || Number.isNaN(h) ? null : h * 60 + (m ?? 0)
}

function r1(n: number) {
  return Math.round(n * 10) / 10
}

function pct(parte: number, total: number): number | null {
  return total > 0 ? r1((parte / total) * 100) : null
}

function hhmm(minutos: number | null): string | null {
  if (minutos === null) return null
  const m = Math.round(minutos)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function tendencia(serie: (number | null)[], umbral: number): 'sube' | 'baja' | 'estable' | null {
  const v = serie.filter((x): x is number => x !== null)
  if (v.length < 3) return null
  // Pendiente por mínimos cuadrados sobre el índice.
  const n = v.length
  const mx = (n - 1) / 2
  const my = v.reduce((s, y) => s + y, 0) / n
  let num = 0
  let den = 0
  v.forEach((y, i) => {
    num += (i - mx) * (y - my)
    den += (i - mx) ** 2
  })
  const pendiente = den > 0 ? num / den : 0
  const cambioTotal = pendiente * (n - 1)
  if (cambioTotal >= umbral) return 'sube'
  if (cambioTotal <= -umbral) return 'baja'
  return 'estable'
}

function localDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}
function hhmmLocal(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}
function primeroDeMes(dia: string): string {
  return dia.slice(0, 7) + '-01'
}
function finDeMes(primero: string): string {
  const [y, m] = primero.split('-').map(Number)
  return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10)
}
function mesSiguiente(primero: string): string {
  const [y, m] = primero.split('-').map(Number)
  return new Date(Date.UTC(y!, m!, 1)).toISOString().slice(0, 10)
}
function etiquetaMes(primero: string): string {
  const [y, m] = primero.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString('es-CO', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
}

export async function buildAnalystFacts(
  db: Db,
  tenantId: string,
  timeZone: string,
  input: AnalystInput,
): Promise<Hechos> {
  const spec = PERIODOS[input.period]
  const ahora = new Date()
  const hoy = localDate(ahora, timeZone)

  // Ventanas actual y anterior (misma longitud). En 1h son sub-diarias; en el
  // resto, días completos que terminan ayer para no analizar un día a medias.
  let from: string, to: string, previousFrom: string, previousTo: string
  let curFromTs: string, curToTs: string, prevFromTs: string, prevToTs: string
  let rangeLabel: string
  if (spec.subhour) {
    curToTs = ahora.toISOString()
    curFromTs = new Date(ahora.getTime() - 3_600_000).toISOString()
    prevToTs = curFromTs
    prevFromTs = new Date(ahora.getTime() - 7_200_000).toISOString()
    from = to = previousFrom = previousTo = hoy
    rangeLabel = `${hoy} · ${hhmmLocal(curFromTs, timeZone)}–${hhmmLocal(curToTs, timeZone)}`
  } else {
    to = masDias(hoy, -1)
    from = masDias(to, -(spec.days - 1))
    previousTo = masDias(from, -1)
    previousFrom = masDias(previousTo, -(spec.days - 1))
    curFromTs = localDayRange(from, timeZone).from
    curToTs = localDayRange(to, timeZone).to
    prevFromTs = localDayRange(previousFrom, timeZone).from
    prevToTs = localDayRange(previousTo, timeZone).to
    rangeLabel = from === to ? from : `${from} – ${to}`
  }

  const [{ data: tenant }, { data: usuarios }] = await Promise.all([
    db.from('tenants').select('legal_name, trade_name').eq('id', tenantId).maybeSingle(),
    db
      .from('users')
      .select('id, full_name, email, department, role, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .in('role', ['employee', 'manager']),
  ])
  const personas = usuarios ?? []
  const ids = personas.map((u) => u.id)

  const periodInfo = {
    from,
    to,
    previousFrom,
    previousTo,
    key: input.period,
    label: spec.label,
    rangeLabel,
  }
  const base: Hechos = {
    company: tenant?.trade_name || tenant?.legal_name || '',
    period: periodInfo,
    people: personas.length,
    totals: { current: empresaVacia(), previous: empresaVacia() },
    departments: [],
    weekly: [],
    profile: [],
    apps: [],
    sites: [],
    signals: [],
    persons: [],
  }
  if (ids.length === 0) return base

  const rpc = db as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
  }
  const { data: cfg } = await db
    .from('tenants')
    .select('work_gap_minutes')
    .eq('id', tenantId)
    .maybeSingle()
  const gapMin = cfg?.work_gap_minutes ?? 30
  const ausencias = await cargarAusencias(db, tenantId, previousFrom, to)
  const [curBlocks, prevBlocks, apps, fuera, perfilR, usage, { data: asignaciones }] =
    await Promise.all([
      rpc.rpc('work_day_blocks', {
        p_from: curFromTs,
        p_to: curToTs,
        p_user_ids: ids,
        p_gap_minutes: gapMin,
        p_tz: timeZone,
      }),
      rpc.rpc('work_day_blocks', {
        p_from: prevFromTs,
        p_to: prevToTs,
        p_user_ids: ids,
        p_gap_minutes: gapMin,
        p_tz: timeZone,
      }),
      rpc.rpc('analyst_user_apps', { p_from: curFromTs, p_to: curToTs, p_user_ids: ids, p_top: 8 }),
      rpc.rpc('analyst_user_offhours', {
        p_from: curFromTs,
        p_to: curToTs,
        p_user_ids: ids,
        p_tz: timeZone,
      }),
      rpc.rpc('report_time_profile', {
        p_from: curFromTs,
        p_to: curToTs,
        p_user_ids: ids,
        p_bucket_minutes: 60,
        p_tz: timeZone,
      }),
      rpc.rpc('analyst_usage', { p_from: curFromTs, p_to: curToTs, p_user_ids: ids, p_top: 12 }),
      db
        .from('user_schedules')
        .select(
          'user_id, effective_from, effective_to, work_schedules(start_time, days_of_week, flex_minutes)',
        )
        .eq('tenant_id', tenantId)
        .in('user_id', ids)
        .lte('effective_from', to),
    ])
  for (const r of [curBlocks, prevBlocks, apps, fuera, perfilR, usage])
    if (r.error) throw new Error(r.error.message)

  const appFilas = (apps.data ?? []) as {
    user_id: string
    app_identifier: string
    productivity: string
    seconds: number
  }[]
  const fueraFilas = (fuera.data ?? []) as {
    user_id: string
    day: string
    early: number
    late: number
    weekend: number
  }[]

  // Perfil de productividad por hora del dia (bucket de 60 min => bucket = hora).
  const profile = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    productive: 0,
    nonProductive: 0,
    neutral: 0,
  }))
  for (const f of (perfilR.data ?? []) as {
    bucket: number
    productive: number
    non_productive: number
    neutral: number
  }[]) {
    const fila = profile[f.bucket]
    if (!fila) continue
    fila.productive += Number(f.productive)
    fila.nonProductive += Number(f.non_productive)
    fila.neutral += Number(f.neutral)
  }

  // Aplicaciones y sitios más usados por toda la empresa.
  const usageRows = (usage.data ?? []) as {
    kind: string
    name: string
    productivity: string
    seconds: number
  }[]
  const empresaApps = usageRows
    .filter((r) => r.kind === 'app')
    .map((r) => ({ name: r.name, productivity: r.productivity, hours: r1(Number(r.seconds) / H) }))
  const empresaSites = usageRows
    .filter((r) => r.kind === 'site')
    .map((r) => ({ name: r.name, productivity: r.productivity, hours: r1(Number(r.seconds) / H) }))

  // ── Horario vigente por persona y día ──
  type Horario = {
    desde: string
    hasta: string | null
    inicioMin: number | null
    dias: number[] | null
    flex: number
  }
  const horarios = new Map<string, Horario[]>()
  for (const a of (asignaciones ?? []) as any[]) {
    const ws = a.work_schedules
    if (!ws) continue
    const lista = horarios.get(a.user_id) ?? []
    lista.push({
      desde: a.effective_from,
      hasta: a.effective_to,
      inicioMin: minutosDeHora(ws.start_time),
      dias: ws.days_of_week,
      flex: ws.flex_minutes ?? 0,
    })
    horarios.set(a.user_id, lista)
  }
  const horarioEl = (uid: string, dia: string) =>
    (horarios.get(uid) ?? []).find((h) => h.desde <= dia && (!h.hasta || h.hasta >= dia)) ?? null
  const creado = new Map(personas.map((u) => [u.id, u.created_at ?? '']))
  const esperado = (uid: string, dia: string) => {
    if ((creado.get(uid) ?? '') > `${dia}T99`) return false
    const dow = localHourAndDow(localDayRange(dia, timeZone).from, timeZone).dow
    const h = horarioEl(uid, dia)
    return h?.dias?.length ? h.dias.includes(dow) : dow >= 1 && dow <= 5
  }

  // ── Índices por persona (ventana actual y anterior) ──
  const indexar = (rows: UserDay[]) => {
    const m = new Map<string, Map<string, UserDay>>()
    for (const d of rows) {
      const u = m.get(d.user_id) ?? new Map()
      u.set(d.day, d)
      m.set(d.user_id, u)
    }
    return m
  }
  const diasCur = indexar((curBlocks.data ?? []) as UserDay[])
  const diasPrev = indexar((prevBlocks.data ?? []) as UserDay[])
  const fueraPor = new Map<string, Map<string, { early: number; late: number; weekend: number }>>()
  for (const f of fueraFilas) {
    const m = fueraPor.get(f.user_id) ?? new Map()
    m.set(f.day, { early: Number(f.early), late: Number(f.late), weekend: Number(f.weekend) })
    fueraPor.set(f.user_id, m)
  }

  // ── Periodo de una persona dentro de [desde, hasta], leyendo `diasMap`. ──
  // skipAtt: en ventanas sub-diarias (1h) no tiene sentido asistencia/tarde.
  function periodo(
    uid: string,
    desde: string,
    hasta: string,
    diasMap: Map<string, UserDay> | undefined,
    skipAtt = false,
  ): PeriodoPersona & { _raw: Raw } {
    const raw: Raw = {
      prod: 0,
      noProd: 0,
      neutro: 0,
      jornada: 0,
      idle: 0,
      esperados: 0,
      leave: 0,
      activos: 0,
      tarde: 0,
      tardeMin: 0,
      ausentes: 0,
      llegadas: [] as number[],
      salidas: [] as number[],
      fuera: 0,
      finde: 0,
      despues19: 0,
    }
    const fueraD = fueraPor.get(uid)
    for (let dia = desde; dia <= hasta; dia = masDias(dia, 1)) {
      if (!skipAtt && ausencias.tipoEn(uid, dia)) {
        raw.leave++
        continue
      }
      const d = diasMap?.get(dia)
      const exp = !skipAtt && esperado(uid, dia)
      if (exp) raw.esperados++
      if (!d) {
        if (exp) raw.ausentes++
        continue
      }
      raw.activos++
      raw.prod += Number(d.productive)
      raw.noProd += Number(d.non_productive)
      raw.neutro += Number(d.neutral)
      raw.jornada += Number(d.worked_seconds)
      raw.idle += Number(d.idle_seconds)
      const medianoche = localMidnightUtc(dia, timeZone).getTime()
      if (d.first_at && d.last_at) {
        raw.llegadas.push((Date.parse(d.first_at) - medianoche) / 60_000)
        raw.salidas.push((Date.parse(d.last_at) - medianoche) / 60_000)
        const h = horarioEl(uid, dia)
        if (!skipAtt && h?.inicioMin !== null && h?.inicioMin !== undefined) {
          const retraso =
            Math.round((Date.parse(d.first_at) - medianoche) / 60_000) - h.inicioMin - h.flex
          if (retraso > 0) {
            raw.tarde++
            raw.tardeMin += retraso
          }
        }
      }
      const f = fueraD?.get(dia)
      if (f) {
        raw.fuera += f.early + f.late
        raw.finde += f.weekend
        if (f.late >= 15 * 60) raw.despues19++
      }
    }
    const registrado = raw.prod + raw.noProd + raw.neutro
    const clasificado = raw.prod + raw.noProd
    const media = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)
    return {
      daysExpected: raw.esperados,
      daysActive: raw.activos,
      activeHoursPerDay: raw.activos > 0 ? r1(registrado / H / raw.activos) : null,
      productivityPct: pct(raw.prod, registrado),
      effectivenessPct: pct(raw.prod, clasificado),
      nonProductivePct: pct(raw.noProd, registrado),
      idlePct: pct(raw.idle, raw.jornada + raw.idle),
      lateDays: raw.tarde,
      avgLateMinutes: raw.tarde > 0 ? Math.round(raw.tardeMin / raw.tarde) : null,
      absentDays: raw.ausentes,
      leaveDays: raw.leave,
      avgArrival: hhmm(media(raw.llegadas)),
      avgEnd: hhmm(media(raw.salidas)),
      offHoursHours: r1(raw.fuera / H),
      weekendHours: r1(raw.finde / H),
      daysAfter19: raw.despues19,
      _raw: raw,
    }
  }

  // Buckets de la serie de tendencia según el periodo (día o mes).
  const buckets: { from: string; to: string; label: string }[] = []
  if (spec.bucket === 'day') {
    for (let d = from; d <= to; d = masDias(d, 1)) buckets.push({ from: d, to: d, label: d })
  } else if (spec.bucket === 'month') {
    for (let m = primeroDeMes(from); m <= to; m = mesSiguiente(m)) {
      const fin = finDeMes(m)
      buckets.push({ from: m < from ? from : m, to: fin > to ? to : fin, label: etiquetaMes(m) })
    }
  }

  // ── Personas ──
  const persons: PersonaHechos[] = []
  const rawActual = new Map<string, Raw>()
  const rawPrevio = new Map<string, Raw>()
  for (const u of personas) {
    const cur = periodo(u.id, from, to, diasCur.get(u.id), spec.subhour)
    const prev = periodo(u.id, previousFrom, previousTo, diasPrev.get(u.id), spec.subhour)
    rawActual.set(u.id, cur._raw)
    rawPrevio.set(u.id, prev._raw)

    const weekly: PersonaHechos['weekly'] = buckets.map((b) => {
      const w = periodo(u.id, b.from, b.to, diasCur.get(u.id), true)
      return {
        week: b.label,
        activeHoursPerDay: w.activeHoursPerDay,
        productivityPct: w.productivityPct,
      }
    })

    const topApps = appFilas
      .filter((a) => a.user_id === u.id)
      .map((a) => ({
        name: a.app_identifier,
        productivity: a.productivity,
        hours: r1(Number(a.seconds) / H),
      }))

    const { _raw: _c, ...current } = cur
    const { _raw: _p, ...previous } = prev
    const p: PersonaHechos = {
      userId: u.id,
      name: u.full_name || u.email,
      department: u.department,
      role: u.role,
      current,
      previous,
      weekly,
      trend: {
        hours: tendencia(
          weekly.map((w) => w.activeHoursPerDay),
          1,
        ),
        productivity: tendencia(
          weekly.map((w) => w.productivityPct),
          8,
        ),
      },
      topApps,
      signals: [],
    }
    p.signals = senalesPersona(p)
    persons.push(p)
  }

  // ── Totales de empresa y por departamento ──
  const agrega = (lista: PersonaHechos[], rawMap: Map<string, Raw>): PeriodoEmpresa => {
    const raws = lista.map((p) => rawMap.get(p.userId)!).filter(Boolean)
    const s = (f: (r: Raw) => number) => raws.reduce((acc, r) => acc + f(r), 0)
    const registrado = s((r) => r.prod + r.noProd + r.neutro)
    const activos = s((r) => r.activos)
    const jornada = s((r) => r.jornada)
    const idle = s((r) => r.idle)
    return {
      activeHoursPerDay: activos > 0 ? r1(registrado / H / activos) : null,
      productivityPct: pct(
        s((r) => r.prod),
        registrado,
      ),
      effectivenessPct: pct(
        s((r) => r.prod),
        s((r) => r.prod + r.noProd),
      ),
      idlePct: pct(idle, jornada + idle),
      latePct: pct(
        s((r) => r.tarde),
        activos,
      ),
      absentDays: s((r) => r.ausentes),
      offHoursHours: r1(s((r) => r.fuera) / H),
      weekendHours: r1(s((r) => r.finde) / H),
      peopleActive: raws.filter((r) => r.activos > 0).length,
    }
  }
  const totals = { current: agrega(persons, rawActual), previous: agrega(persons, rawPrevio) }

  const deptNombres = [...new Set(persons.map((p) => p.department || 'Sin departamento'))].sort(
    (a, b) => a.localeCompare(b, 'es'),
  )
  const departments = deptNombres.map((name) => {
    const lista = persons.filter((p) => (p.department || 'Sin departamento') === name)
    const c = agrega(lista, rawActual)
    const pv = agrega(lista, rawPrevio)
    return {
      name,
      people: lista.length,
      activeHoursPerDay: c.activeHoursPerDay,
      productivityPct: c.productivityPct,
      deltaProductivityPp:
        c.productivityPct !== null && pv.productivityPct !== null
          ? r1(c.productivityPct - pv.productivityPct)
          : null,
    }
  })

  // ── Serie de la empresa (mismos buckets) ──
  const weekly: Hechos['weekly'] = buckets.map((b) => {
    const raws = persons.map(
      (p) => periodo(p.userId, b.from, b.to, diasCur.get(p.userId), true)._raw,
    )
    const s = (f: (r: Raw) => number) => raws.reduce((acc, r) => acc + f(r), 0)
    const registrado = s((r) => r.prod + r.noProd + r.neutro)
    const activos = s((r) => r.activos)
    return {
      week: b.label,
      activeHoursPerDay: activos > 0 ? r1(registrado / H / activos) : null,
      productivityPct: pct(
        s((r) => r.prod),
        registrado,
      ),
      latePct: pct(
        s((r) => r.tarde),
        activos,
      ),
    }
  })

  const signals = [
    ...senalesEmpresa(totals, departments, persons),
    ...persons.flatMap((p) => p.signals),
  ].sort((a, b) => peso(a.severity) - peso(b.severity))

  return {
    ...base,
    totals,
    departments,
    weekly,
    profile,
    apps: empresaApps,
    sites: empresaSites,
    signals,
    persons: persons.sort((a, b) => a.name.localeCompare(b.name, 'es')),
  }
}

interface Raw {
  prod: number
  noProd: number
  neutro: number
  jornada: number
  idle: number
  esperados: number
  leave: number
  activos: number
  tarde: number
  tardeMin: number
  ausentes: number
  llegadas: number[]
  salidas: number[]
  fuera: number
  finde: number
  despues19: number
}

function empresaVacia(): PeriodoEmpresa {
  return {
    activeHoursPerDay: null,
    productivityPct: null,
    effectivenessPct: null,
    idlePct: null,
    latePct: null,
    absentDays: 0,
    offHoursHours: 0,
    weekendHours: 0,
    peopleActive: 0,
  }
}

function peso(s: Severidad) {
  return { alta: 0, media: 1, baja: 2, positiva: 3 }[s]
}

// ── Reglas ──────────────────────────────────────────────────────────────────
// Umbrales pensados para una jornada de 8 h. Son conservadores a propósito:
// una señal que salta con todo el mundo no sirve para decidir nada.

function senalesPersona(p: PersonaHechos): Senal[] {
  const out: Senal[] = []
  const c = p.current
  const v = p.previous
  const uid = p.userId
  const n = p.name

  if (c.daysExpected >= 3 && c.daysActive === 0) {
    out.push({
      code: 'sin_actividad',
      severity: 'alta',
      userId: uid,
      title: `${n} no registra actividad`,
      detail: `Tenía ${c.daysExpected} días de jornada esperados y el agente no reportó ninguno. Puede ser ausencia, equipo apagado o agente caído.`,
    })
    return out
  }
  if (c.daysActive === 0) return out

  if (c.productivityPct !== null && v.productivityPct !== null && v.daysActive >= 3) {
    const d = c.productivityPct - v.productivityPct
    if (d <= -10)
      out.push({
        code: 'cae_productividad',
        severity: d <= -20 ? 'alta' : 'media',
        userId: uid,
        title: `${n}: productividad cae ${Math.abs(Math.round(d))} pp`,
        detail: `Pasó de ${v.productivityPct}% a ${c.productivityPct}% del tiempo en aplicaciones productivas frente al periodo anterior.`,
      })
    if (d >= 10)
      out.push({
        code: 'sube_productividad',
        severity: 'positiva',
        userId: uid,
        title: `${n}: productividad sube ${Math.round(d)} pp`,
        detail: `Pasó de ${v.productivityPct}% a ${c.productivityPct}%.`,
      })
  }
  if (c.activeHoursPerDay !== null && v.activeHoursPerDay !== null && v.daysActive >= 3) {
    const d = (c.activeHoursPerDay - v.activeHoursPerDay) / v.activeHoursPerDay
    if (d <= -0.2)
      out.push({
        code: 'caen_horas',
        severity: d <= -0.35 ? 'alta' : 'media',
        userId: uid,
        title: `${n}: ${Math.round(-d * 100)}% menos horas activas al día`,
        detail: `De ${v.activeHoursPerDay} h a ${c.activeHoursPerDay} h activas por día frente al periodo anterior.`,
      })
  }
  if (p.trend.productivity === 'baja' && !out.some((s) => s.code === 'cae_productividad'))
    out.push({
      code: 'tendencia_baja',
      severity: 'media',
      userId: uid,
      title: `${n}: tendencia descendente de productividad`,
      detail: `A lo largo del periodo la productividad viene bajando: ${p.weekly.map((w) => (w.productivityPct === null ? '—' : `${w.productivityPct}%`)).join(' → ')}.`,
    })
  if (
    c.activeHoursPerDay !== null &&
    (c.activeHoursPerDay >= 9.5 || c.daysAfter19 >= 3 || c.weekendHours >= 4)
  )
    out.push({
      code: 'sobrecarga',
      severity: c.activeHoursPerDay >= 10.5 || c.weekendHours >= 8 ? 'alta' : 'media',
      userId: uid,
      title: `${n}: riesgo de sobrecarga`,
      detail: `${c.activeHoursPerDay} h activas por día, ${c.daysAfter19} días trabajando después de las 19:00 y ${c.weekendHours} h en fin de semana. Revisar carga y desconexión (Ley 2191).`,
    })
  if (c.daysActive >= 5 && c.lateDays / c.daysActive >= 0.4)
    out.push({
      code: 'impuntualidad',
      severity: c.lateDays / c.daysActive >= 0.7 ? 'alta' : 'media',
      userId: uid,
      title: `${n}: llega tarde ${c.lateDays} de ${c.daysActive} días`,
      detail: `Retraso promedio de ${c.avgLateMinutes} min sobre su hora de entrada; llegada media a las ${c.avgArrival}.`,
    })
  if (c.absentDays >= 2)
    out.push({
      code: 'ausentismo',
      severity: c.absentDays >= 4 ? 'alta' : 'media',
      userId: uid,
      title: `${n}: ${c.absentDays} días sin actividad con jornada esperada`,
      detail: `Sobre ${c.daysExpected} días esperados. Contrastar con ausencias aprobadas antes de concluir.`,
    })
  if (c.nonProductivePct !== null && c.nonProductivePct >= 25 && c.daysActive >= 3) {
    const top = p.topApps.filter((a) => a.productivity === 'non_productive').slice(0, 3)
    out.push({
      code: 'distraccion',
      severity: c.nonProductivePct >= 40 ? 'alta' : 'media',
      userId: uid,
      title: `${n}: ${c.nonProductivePct}% del tiempo en aplicaciones improductivas`,
      detail: top.length
        ? `Principalmente ${top.map((a) => `${a.name} (${a.hours} h)`).join(', ')}.`
        : 'Revisar la clasificación de aplicaciones antes de concluir.',
    })
  }
  if (c.idlePct !== null && c.idlePct >= 40 && c.daysActive >= 3)
    out.push({
      code: 'inactividad',
      severity: c.idlePct >= 60 ? 'alta' : 'media',
      userId: uid,
      title: `${n}: ${c.idlePct}% de la jornada sin interacción`,
      detail: `Equipo encendido sin teclado ni ratón. Puede ser trabajo fuera del computador (reuniones, llamadas, campo) o un equipo que se deja encendido.`,
    })
  if (
    c.productivityPct !== null &&
    c.productivityPct >= 70 &&
    c.daysActive >= 5 &&
    c.lateDays === 0 &&
    c.absentDays === 0
  )
    out.push({
      code: 'destacado',
      severity: 'positiva',
      userId: uid,
      title: `${n}: desempeño consistente`,
      detail: `${c.productivityPct}% productivo, sin retrasos ni ausencias en ${c.daysActive} días.`,
    })
  return out
}

function senalesEmpresa(
  totals: Hechos['totals'],
  departments: Hechos['departments'],
  persons: PersonaHechos[],
): Senal[] {
  const out: Senal[] = []
  const c = totals.current
  const v = totals.previous
  if (c.productivityPct !== null && v.productivityPct !== null) {
    const d = c.productivityPct - v.productivityPct
    if (d <= -5)
      out.push({
        code: 'empresa_cae_productividad',
        severity: d <= -10 ? 'alta' : 'media',
        userId: null,
        title: `La productividad de la empresa cae ${Math.abs(r1(d))} pp`,
        detail: `De ${v.productivityPct}% a ${c.productivityPct}% frente al periodo anterior.`,
      })
    if (d >= 5)
      out.push({
        code: 'empresa_sube_productividad',
        severity: 'positiva',
        userId: null,
        title: `La productividad de la empresa sube ${r1(d)} pp`,
        detail: `De ${v.productivityPct}% a ${c.productivityPct}%.`,
      })
  }
  if (c.latePct !== null && c.latePct >= 30)
    out.push({
      code: 'empresa_impuntualidad',
      severity: c.latePct >= 50 ? 'alta' : 'media',
      userId: null,
      title: `${c.latePct}% de las jornadas empiezan tarde`,
      detail: 'Si es generalizado, el problema suele ser el horario configurado, no las personas.',
    })
  const finde = persons.filter((p) => p.current.weekendHours >= 4).length
  if (finde >= Math.max(2, Math.ceil(persons.length * 0.25)))
    out.push({
      code: 'empresa_fin_de_semana',
      severity: 'media',
      userId: null,
      title: `${finde} personas trabajan en fin de semana`,
      detail: `${c.weekendHours} h en total fuera de la semana laboral. Revisar carga y desconexión digital.`,
    })
  const ordenados = departments
    .filter((d) => d.productivityPct !== null && d.people >= 2)
    .sort((a, b) => (b.productivityPct ?? 0) - (a.productivityPct ?? 0))
  if (ordenados.length >= 2) {
    const mejor = ordenados[0]!
    const peor = ordenados[ordenados.length - 1]!
    if ((mejor.productivityPct ?? 0) - (peor.productivityPct ?? 0) >= 20)
      out.push({
        code: 'brecha_departamentos',
        severity: 'media',
        userId: null,
        title: `Brecha entre departamentos: ${mejor.name} ${mejor.productivityPct}% vs ${peor.name} ${peor.productivityPct}%`,
        detail:
          'Una brecha así casi siempre es de clasificación de aplicaciones (lo que es productivo en un área no lo es en otra) antes que de personas.',
      })
  }
  const sinDatos = persons.filter((p) => p.signals.some((s) => s.code === 'sin_actividad')).length
  if (sinDatos >= 2)
    out.push({
      code: 'empresa_sin_datos',
      severity: 'alta',
      userId: null,
      title: `${sinDatos} personas sin ningún dato en el periodo`,
      detail:
        'Antes de leer cualquier promedio, confirmar que sus agentes están instalados y reportando.',
    })
  return out
}
