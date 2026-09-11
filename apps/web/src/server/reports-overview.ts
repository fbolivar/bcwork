import { localDayRange, localHourAndDow, localMidnightUtc } from '@/lib/tz'
import type { getDb } from '@/lib/db'

type Db = ReturnType<typeof getDb>

/**
 * Informes > Resumen: KPIs, perfil de productividad por hora, rankings y
 * aplicaciones para un rango y un conjunto de equipos o personas.
 *
 * La suma la hace Postgres (report_user_days, report_time_profile,
 * report_app_totals): un mes de GVM son ~150 000 eventos y traerlos al
 * servidor para sumarlos no tiene sentido.
 */

export interface ReportsOverviewInput {
  from: string // YYYY-MM-DD local
  to: string // YYYY-MM-DD local, inclusive
  team_ids?: string[]
  user_ids?: string[]
}

interface UserDay {
  user_id: string
  day: string
  productive: number
  non_productive: number
  neutral: number
  first_at: string
  last_at: string
}

export interface PersonaInforme {
  userId: string
  name: string
  productiveSecs: number
  nonProductiveSecs: number
  neutralSecs: number
  trackedSecs: number
  atWorkSecs: number
  idleSecs: number
  productivityPct: number | null
  unproductivePct: number | null
  effectivenessPct: number | null
  lateSecs: number
  lateDays: number
  absentDays: number
}

function minutosDeHora(hhmm: string | null): number | null {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h === undefined || Number.isNaN(h) ? null : h * 60 + (m ?? 0)
}

function masDias(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export async function buildReportsOverview(
  db: Db,
  tenantId: string,
  timeZone: string,
  input: ReportsOverviewInput,
) {
  const from = localDayRange(input.from, timeZone).from
  const to = localDayRange(input.to, timeZone).to

  // ── Personas del filtro ──
  const [{ data: usuarios }, { data: equipos }, { data: miembrosEquipo }] = await Promise.all([
    db
      .from('users')
      .select('id, full_name, email, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .in('role', ['employee', 'manager']),
    db.from('teams').select('id, name').eq('tenant_id', tenantId).order('name'),
    db.from('team_members').select('team_id, user_id').eq('tenant_id', tenantId),
  ])
  const todos = usuarios ?? []
  let elegidos = todos
  if (input.team_ids?.length || input.user_ids?.length) {
    const set = new Set(input.user_ids ?? [])
    for (const m of miembrosEquipo ?? [])
      if (input.team_ids?.includes(m.team_id)) set.add(m.user_id)
    elegidos = todos.filter((u) => set.has(u.id))
  }
  const ids = elegidos.map((u) => u.id)
  const nombre = new Map(elegidos.map((u) => [u.id, u.full_name || u.email]))
  const creado = new Map(elegidos.map((u) => [u.id, u.created_at ?? '']))

  const filtros = {
    teams: (equipos ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      members: (miembrosEquipo ?? []).filter((m) => m.team_id === t.id).length,
    })),
    members: todos.map((u) => ({ id: u.id, name: u.full_name || u.email })),
  }

  if (ids.length === 0) {
    return {
      from: input.from,
      to: input.to,
      people: 0,
      filters: filtros,
      hasData: false,
      kpis: null,
      profile: [],
      rankings: null,
      apps: null,
      people_detail: [] as PersonaInforme[],
    }
  }

  // ── Agregados en Postgres + horarios + sesiones (inactividad) + proyectos ──
  const rpc = db as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
  }
  const [dias, perfil, apps, { data: asignaciones }, { data: sesiones }, { data: proyectos }] =
    await Promise.all([
      rpc.rpc('report_user_days', { p_from: from, p_to: to, p_user_ids: ids, p_tz: timeZone }),
      rpc.rpc('report_time_profile', {
        p_from: from,
        p_to: to,
        p_user_ids: ids,
        p_bucket_minutes: 30,
        p_tz: timeZone,
      }),
      rpc.rpc('report_app_totals', { p_from: from, p_to: to, p_user_ids: ids }),
      db
        .from('user_schedules')
        .select(
          'user_id, effective_from, effective_to, work_schedules(start_time, days_of_week, flex_minutes)',
        )
        .eq('tenant_id', tenantId)
        .in('user_id', ids)
        .lte('effective_from', input.to),
      db
        .from('work_sessions')
        .select('user_id, idle_seconds')
        .eq('tenant_id', tenantId)
        .in('user_id', ids)
        .gte('started_at', from)
        .lt('started_at', to),
      db
        .from('project_time_entries')
        .select('duration_seconds')
        .eq('tenant_id', tenantId)
        .in('user_id', ids)
        .gte('started_at', from)
        .lt('started_at', to),
    ])
  for (const r of [dias, perfil, apps]) if (r.error) throw new Error(r.error.message)

  const userDays = (dias.data ?? []) as UserDay[]
  const perfilFilas = (perfil.data ?? []) as {
    bucket: number
    productive: number
    non_productive: number
    neutral: number
  }[]
  const appFilas = (apps.data ?? []) as {
    app_identifier: string
    productivity: string
    seconds: number
  }[]

  // ── Horario vigente por persona y dia (para tarde y ausente) ──
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

  const inactivo = new Map<string, number>()
  for (const s of sesiones ?? [])
    inactivo.set(s.user_id, (inactivo.get(s.user_id) ?? 0) + (s.idle_seconds ?? 0))

  // ── Por persona ──
  const porPersona = new Map<string, PersonaInforme>()
  for (const u of elegidos) {
    porPersona.set(u.id, {
      userId: u.id,
      name: nombre.get(u.id) ?? '',
      productiveSecs: 0,
      nonProductiveSecs: 0,
      neutralSecs: 0,
      trackedSecs: 0,
      atWorkSecs: 0,
      idleSecs: inactivo.get(u.id) ?? 0,
      productivityPct: null,
      unproductivePct: null,
      effectivenessPct: null,
      lateSecs: 0,
      lateDays: 0,
      absentDays: 0,
    })
  }
  const diasCon = new Map<string, Set<string>>()
  for (const d of userDays) {
    const p = porPersona.get(d.user_id)
    if (!p) continue
    p.productiveSecs += Number(d.productive)
    p.nonProductiveSecs += Number(d.non_productive)
    p.neutralSecs += Number(d.neutral)
    // Jornada: de la primera a la ultima actividad del dia, nunca menor que lo registrado.
    const jornada = Math.round((Date.parse(d.last_at) - Date.parse(d.first_at)) / 1000)
    const registrado = Number(d.productive) + Number(d.non_productive) + Number(d.neutral)
    p.atWorkSecs += Math.max(jornada, registrado)
    diasCon.set(d.user_id, (diasCon.get(d.user_id) ?? new Set()).add(d.day))
    // Tarde: contra la hora de entrada del horario vigente ese dia.
    const h = horarioEl(d.user_id, d.day)
    if (h?.inicioMin !== null && h?.inicioMin !== undefined) {
      const medianoche = localMidnightUtc(d.day, timeZone).getTime()
      const llegadaMin = Math.round((Date.parse(d.first_at) - medianoche) / 60_000)
      const retraso = llegadaMin - h.inicioMin - h.flex
      if (retraso > 0) {
        p.lateSecs += retraso * 60
        p.lateDays += 1
      }
    }
  }
  // Ausente: dia esperado (horario o lunes-viernes) sin ninguna actividad, con la persona ya creada.
  // Un dia futuro no es una ausencia: se cuenta solo hasta hoy (hora local).
  const hoyLocal = new Date(
    Date.now() +
      (localHourAndDow(new Date().toISOString(), timeZone).hour - new Date().getUTCHours()) *
        3_600_000,
  )
    .toISOString()
    .slice(0, 10)
  const hastaAusencias = input.to < hoyLocal ? input.to : hoyLocal
  for (let dia = input.from; dia <= hastaAusencias; dia = masDias(dia, 1)) {
    const dow = localHourAndDow(localDayRange(dia, timeZone).from, timeZone).dow
    for (const p of porPersona.values()) {
      if ((creado.get(p.userId) ?? '') > `${dia}T99`) continue
      const h = horarioEl(p.userId, dia)
      const esperado = h?.dias?.length ? h.dias.includes(dow) : dow >= 1 && dow <= 5
      if (esperado && !diasCon.get(p.userId)?.has(dia)) p.absentDays += 1
    }
  }
  for (const p of porPersona.values()) {
    p.trackedSecs = p.productiveSecs + p.nonProductiveSecs + p.neutralSecs
    p.productivityPct =
      p.trackedSecs > 0 ? Math.round((p.productiveSecs / p.trackedSecs) * 1000) / 10 : null
    p.unproductivePct =
      p.trackedSecs > 0 ? Math.round((p.nonProductiveSecs / p.trackedSecs) * 1000) / 10 : null
    const clasificado = p.productiveSecs + p.nonProductiveSecs
    p.effectivenessPct =
      clasificado > 0 ? Math.round((p.productiveSecs / clasificado) * 1000) / 10 : null
  }
  const personas = [...porPersona.values()]
  const conDatos = personas.filter((p) => p.trackedSecs > 0)

  // ── KPIs ──
  const suma = (f: (p: PersonaInforme) => number) => personas.reduce((s, p) => s + f(p), 0)
  const prod = suma((p) => p.productiveSecs)
  const noProd = suma((p) => p.nonProductiveSecs)
  const tracked = suma((p) => p.trackedSecs)
  const kpis = {
    trackedSecs: tracked,
    atWorkSecs: suma((p) => p.atWorkSecs),
    idleSecs: suma((p) => p.idleSecs),
    projectSecs: (proyectos ?? []).reduce((s, e) => s + (e.duration_seconds ?? 0), 0),
    effectivenessPct: prod + noProd > 0 ? Math.round((prod / (prod + noProd)) * 1000) / 10 : null,
    productivityPct: tracked > 0 ? Math.round((prod / tracked) * 1000) / 10 : null,
  }

  // ── Perfil por media hora: % del tiempo disponible del equipo en esa franja ──
  const diasRango = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000))
  const capacidadFranja = ids.length * diasRango * 1800
  const profile = Array.from({ length: 48 }, (_, b) => {
    const f = perfilFilas.find((x) => x.bucket === b)
    const pct = (v: number) =>
      capacidadFranja > 0 ? Math.round((v / capacidadFranja) * 1000) / 10 : 0
    return {
      bucket: b,
      label: `${String(Math.floor(b / 2)).padStart(2, '0')}:${b % 2 ? '30' : '00'}`,
      productive: pct(Number(f?.productive ?? 0)),
      nonProductive: pct(Number(f?.non_productive ?? 0)),
      neutral: pct(Number(f?.neutral ?? 0)),
    }
  })

  // ── Rankings ──
  const top = (arr: PersonaInforme[]) => arr.slice(0, 5)
  const rankings = {
    mostProductive: top([...conDatos].sort((a, b) => b.productiveSecs - a.productiveSecs)),
    mostUnproductive: top(
      [...conDatos]
        .filter((p) => p.nonProductiveSecs > 0)
        .sort((a, b) => b.nonProductiveSecs - a.nonProductiveSecs),
    ),
    mostEffective: top(
      [...conDatos]
        .filter((p) => p.effectivenessPct !== null)
        .sort((a, b) => (b.effectivenessPct ?? 0) - (a.effectivenessPct ?? 0)),
    ),
    mostTracked: top([...conDatos].sort((a, b) => b.trackedSecs - a.trackedSecs)),
    late: top(personas.filter((p) => p.lateSecs > 0).sort((a, b) => b.lateSecs - a.lateSecs)),
    absent: top(
      personas.filter((p) => p.absentDays > 0).sort((a, b) => b.absentDays - a.absentDays),
    ),
    mostIdle: top(personas.filter((p) => p.idleSecs > 0).sort((a, b) => b.idleSecs - a.idleSecs)),
    counts: {
      productive: conDatos.length,
      unproductive: conDatos.filter((p) => p.nonProductiveSecs > 0).length,
      effective: conDatos.filter((p) => p.effectivenessPct !== null).length,
      tracked: conDatos.length,
      late: personas.filter((p) => p.lateSecs > 0).length,
      absent: personas.filter((p) => p.absentDays > 0).length,
      idle: personas.filter((p) => p.idleSecs > 0).length,
    },
  }

  // ── Apps ──
  const clase = (p: string) =>
    p === 'productive' ? 'productive' : p === 'non_productive' ? 'nonProductive' : 'neutral'
  const appsPor: Record<
    'productive' | 'nonProductive' | 'neutral',
    { name: string; seconds: number }[]
  > = { productive: [], nonProductive: [], neutral: [] }
  for (const a of appFilas)
    appsPor[clase(a.productivity)].push({ name: a.app_identifier, seconds: Number(a.seconds) })
  const columna = (l: { name: string; seconds: number }[]) => {
    l.sort((a, b) => b.seconds - a.seconds)
    return { total: l.reduce((s, x) => s + x.seconds, 0), count: l.length, top: l.slice(0, 10) }
  }

  return {
    from: input.from,
    to: input.to,
    people: ids.length,
    filters: filtros,
    hasData: tracked > 0,
    kpis,
    profile,
    rankings,
    people_detail: personas.sort((a, b) => b.trackedSecs - a.trackedSecs),
    apps: {
      productive: columna(appsPor.productive),
      nonProductive: columna(appsPor.nonProductive),
      neutral: columna(appsPor.neutral),
    },
  }
}
