import type { getDb } from '@/lib/db'

type Db = ReturnType<typeof getDb>

export const REPORT_TYPES = [
  'attendance',
  'productivity',
  'absences',
  'payroll',
  'overview',
] as const
export type ReportType = (typeof REPORT_TYPES)[number]

export interface ReportInput {
  report_type: ReportType
  date_from: string
  date_to: string
  department?: string
  user_ids?: string[]
  /** Traer tambien el periodo anterior de igual duracion. Por defecto si. */
  compare?: boolean
}

/** Error atribuible a lo que pidio quien llama, no a una falla del sistema. */
export class ReportInputError extends Error {}

/**
 * Calculo de los informes del panel de administracion.
 *
 * Vive fuera del router porque lo necesitan dos consumidores: el generador
 * interactivo (admin.runCustomReport) y el cron que envia los informes
 * programados por correo. Tenerlo duplicado era garantizar que un dia el
 * informe que llega al correo dijera otra cosa que el de la pantalla.
 *
 * Cada informe devuelve el detalle, el agregado por departamento y ese mismo
 * agregado del periodo inmediatamente anterior de igual duracion.
 */
export async function runReport(db: Db, tenantId: string, input: ReportInput) {
  const tid = tenantId
  const { report_type, department, user_ids, compare = true } = input

  const desde = new Date(input.date_from)
  const hasta = new Date(input.date_to)
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
    throw new ReportInputError('Rango de fechas invalido')
  }
  if (hasta < desde) {
    throw new ReportInputError('La fecha final es anterior a la inicial')
  }

  // Periodo anterior: misma duracion, terminando justo antes de `desde`.
  const DIA = 86_400_000
  const duracion = Math.max(hasta.getTime() - desde.getTime(), DIA)
  const prevHasta = new Date(desde.getTime() - 1)
  const prevDesde = new Date(prevHasta.getTime() - duracion)

  const iso = (d: Date) => d.toISOString()
  const dia = (d: Date) => d.toISOString().slice(0, 10)

  // ── Universo de personas (una sola consulta: filtra y sirve de join) ──
  const { data: usuarios, error: uErr } = await db
    .from('users')
    .select('id, full_name, email, department, position')
    .eq('tenant_id', tid)
  if (uErr) throw new Error(uErr.message)

  const permitidos = (usuarios ?? []).filter((u) => {
    if (department && (u.department ?? '') !== department) return false
    if (user_ids?.length && !user_ids.includes(u.id ?? '')) return false
    return true
  })
  const ids = permitidos.map((u) => u.id ?? '').filter(Boolean)
  const porId = new Map(permitidos.map((u) => [u.id ?? '', u]))
  const SIN_AREA = 'Sin departamento'
  const areaDe = (uid: string) => porId.get(uid)?.department || SIN_AREA
  const nombreDe = (uid: string) =>
    porId.get(uid)?.full_name || porId.get(uid)?.email || 'Desconocido'

  const departamentos = [
    ...new Set((usuarios ?? []).map((u) => u.department).filter(Boolean) as string[]),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  /** Agrega una lista de {userId, value} en totales por departamento. */
  function agrupar(items: { userId: string; value: number }[]) {
    const acc = new Map<string, { value: number; people: Set<string> }>()
    for (const it of items) {
      const k = areaDe(it.userId)
      const a = acc.get(k) ?? { value: 0, people: new Set<string>() }
      a.value += it.value
      a.people.add(it.userId)
      acc.set(k, a)
    }
    return acc
  }

  /** Une el agregado actual con el anterior y calcula la variacion. */
  function comparar(
    actual: Map<string, { value: number; people: Set<string> }>,
    anterior: Map<string, { value: number; people: Set<string> }> | null,
  ) {
    const claves = [...new Set([...actual.keys(), ...(anterior?.keys() ?? [])])].sort((a, b) =>
      a.localeCompare(b, 'es'),
    )
    const groups = claves.map((k) => {
      const cur = actual.get(k)?.value ?? 0
      const prev = anterior ? (anterior.get(k)?.value ?? 0) : null
      return {
        department: k,
        people: actual.get(k)?.people.size ?? 0,
        value: Math.round(cur * 100) / 100,
        previousValue: prev === null ? null : Math.round(prev * 100) / 100,
        // Sin base anterior no hay variacion porcentual que signifique algo.
        deltaPct: prev === null || prev === 0 ? null : Math.round(((cur - prev) / prev) * 100),
      }
    })
    const total = groups.reduce((s, g) => s + g.value, 0)
    const totalPrev = anterior ? groups.reduce((s, g) => s + (g.previousValue ?? 0), 0) : null
    return {
      groups,
      totals: {
        value: Math.round(total * 100) / 100,
        previousValue: totalPrev === null ? null : Math.round(totalPrev * 100) / 100,
        deltaPct:
          totalPrev === null || totalPrev === 0
            ? null
            : Math.round(((total - totalPrev) / totalPrev) * 100),
      },
    }
  }

  const periodo = {
    from: input.date_from,
    to: input.date_to,
    previousFrom: iso(prevDesde),
    previousTo: iso(prevHasta),
  }

  // Sin personas que cumplan el filtro no hay nada que consultar.
  if (ids.length === 0) {
    return {
      type: report_type,
      rows: [] as Record<string, unknown>[],
      metricLabel: '',
      groups: [] as ReturnType<typeof comparar>['groups'],
      totals: { value: 0, previousValue: null, deltaPct: null },
      period: periodo,
      departments: departamentos,
    }
  }

  // ── Asistencia: horas trabajadas por sesion ──
  if (report_type === 'attendance') {
    const sesiones = (a: Date, b: Date) =>
      db
        .from('work_sessions')
        .select('user_id, started_at, ended_at, active_seconds, idle_seconds, location_type')
        .eq('tenant_id', tid)
        .in('user_id', ids)
        .gte('started_at', iso(a))
        .lte('started_at', iso(b))
        .order('started_at', { ascending: false })

    const [cur, prev] = await Promise.all([
      sesiones(desde, hasta),
      compare ? sesiones(prevDesde, prevHasta) : Promise.resolve(null),
    ])
    if (cur.error) throw new Error(cur.error.message)

    const rows = (cur.data ?? []).map((s) => ({
      user_id: s.user_id,
      full_name: nombreDe(s.user_id),
      department: areaDe(s.user_id),
      started_at: s.started_at,
      ended_at: s.ended_at,
      active_hours: Math.round(((s.active_seconds ?? 0) / 3600) * 100) / 100,
      idle_hours: Math.round(((s.idle_seconds ?? 0) / 3600) * 100) / 100,
      location_type: s.location_type,
    }))
    const val = (rs: { user_id: string; active_seconds: number | null }[]) =>
      rs.map((s) => ({ userId: s.user_id, value: (s.active_seconds ?? 0) / 3600 }))
    const cmp = comparar(agrupar(val(cur.data ?? [])), prev?.data ? agrupar(val(prev.data)) : null)
    return {
      type: 'attendance' as const,
      rows,
      metricLabel: 'Horas activas',
      ...cmp,
      period: periodo,
      departments: departamentos,
    }
  }

  // ── Productividad: agregado diario por persona ──
  if (report_type === 'productivity') {
    const metricasDiarias = (a: Date, b: Date) =>
      db
        .from('daily_user_metrics')
        .select(
          'user_id, metric_date, active_seconds, productive_seconds, non_productive_seconds, expected_seconds',
        )
        .eq('tenant_id', tid)
        .in('user_id', ids)
        .gte('metric_date', dia(a))
        .lte('metric_date', dia(b))
        .order('metric_date', { ascending: false })

    const [cur, prev] = await Promise.all([
      metricasDiarias(desde, hasta),
      compare ? metricasDiarias(prevDesde, prevHasta) : Promise.resolve(null),
    ])
    if (cur.error) throw new Error(cur.error.message)

    const rows = (cur.data ?? []).map((m) => ({
      user_id: m.user_id,
      full_name: nombreDe(m.user_id),
      department: areaDe(m.user_id),
      metric_date: m.metric_date,
      active_hours: Math.round(((m.active_seconds ?? 0) / 3600) * 100) / 100,
      productive_hours: Math.round(((m.productive_seconds ?? 0) / 3600) * 100) / 100,
      non_productive_hours: Math.round(((m.non_productive_seconds ?? 0) / 3600) * 100) / 100,
      productivity_pct:
        m.active_seconds && m.active_seconds > 0
          ? Math.round(((m.productive_seconds ?? 0) / m.active_seconds) * 100)
          : null,
    }))
    const val = (rs: { user_id: string; productive_seconds: number | null }[]) =>
      rs.map((m) => ({ userId: m.user_id, value: (m.productive_seconds ?? 0) / 3600 }))
    const cmp = comparar(agrupar(val(cur.data ?? [])), prev?.data ? agrupar(val(prev.data)) : null)
    return {
      type: 'productivity' as const,
      rows,
      metricLabel: 'Horas productivas',
      ...cmp,
      period: periodo,
      departments: departamentos,
    }
  }

  // ── Ausencias: dias solicitados ──
  if (report_type === 'absences') {
    // La tabla identifica a la persona con employee_id, no user_id, y ya
    // guarda days_count: no hay que recalcular la duracion.
    const ausencias = (a: Date, b: Date) =>
      db
        .from('absence_requests')
        .select('employee_id, start_date, end_date, days_count, type, status')
        .eq('tenant_id', tid)
        .in('employee_id', ids)
        .gte('start_date', dia(a))
        .lte('start_date', dia(b))
        .order('start_date', { ascending: false })

    const [cur, prev] = await Promise.all([
      ausencias(desde, hasta),
      compare ? ausencias(prevDesde, prevHasta) : Promise.resolve(null),
    ])
    if (cur.error) throw new Error(cur.error.message)

    const rows = (cur.data ?? []).map((a) => ({
      user_id: a.employee_id,
      full_name: nombreDe(a.employee_id),
      department: areaDe(a.employee_id),
      start_date: a.start_date,
      end_date: a.end_date,
      days: a.days_count ?? 0,
      absence_type: a.type,
      status: a.status,
    }))
    const val = (rs: { employee_id: string; days_count: number | null }[]) =>
      rs.map((a) => ({ userId: a.employee_id, value: a.days_count ?? 0 }))
    const cmp = comparar(agrupar(val(cur.data ?? [])), prev?.data ? agrupar(val(prev.data)) : null)
    return {
      type: 'absences' as const,
      rows,
      metricLabel: 'Dias de ausencia',
      ...cmp,
      period: periodo,
      departments: departamentos,
    }
  }

  // ── Nomina: neto pagado en el periodo ──
  if (report_type === 'payroll') {
    const colillas = (a: Date, b: Date) =>
      db
        .from('payslips' as any)
        .select(
          'employee_id, period_start, period_end, gross_amount, deductions, net_amount, status',
        )
        .eq('tenant_id', tid)
        .in('employee_id', ids)
        .gte('period_start', dia(a))
        .lte('period_end', dia(b))

    const [cur, prev] = await Promise.all([
      colillas(desde, hasta),
      compare ? colillas(prevDesde, prevHasta) : Promise.resolve(null),
    ])
    if (cur.error) throw new Error(cur.error.message)

    const rows = ((cur.data ?? []) as any[]).map((p) => ({
      user_id: p.employee_id as string,
      full_name: nombreDe(p.employee_id as string),
      department: areaDe(p.employee_id as string),
      period_start: p.period_start,
      period_end: p.period_end,
      gross_amount: Number(p.gross_amount ?? 0),
      deductions: Number(p.deductions ?? 0),
      net_amount: Number(p.net_amount ?? 0),
      status: p.status,
    }))
    const val = (rs: any[]) =>
      rs.map((p) => ({ userId: p.employee_id as string, value: Number(p.net_amount ?? 0) }))
    const cmp = comparar(
      agrupar(val((cur.data ?? []) as any[])),
      prev?.data ? agrupar(val(prev.data as any[])) : null,
    )
    return {
      type: 'payroll' as const,
      rows,
      metricLabel: 'Neto pagado',
      ...cmp,
      period: periodo,
      departments: departamentos,
    }
  }

  // ── Resumen general: una fila por persona ──
  const resumen = (a: Date, b: Date) =>
    db
      .from('daily_user_metrics')
      .select('user_id, active_seconds, productive_seconds, expected_seconds')
      .eq('tenant_id', tid)
      .in('user_id', ids)
      .gte('metric_date', dia(a))
      .lte('metric_date', dia(b))

  const [cur, prev] = await Promise.all([
    resumen(desde, hasta),
    compare ? resumen(prevDesde, prevHasta) : Promise.resolve(null),
  ])
  if (cur.error) throw new Error(cur.error.message)

  const porUsuario = new Map<
    string,
    { active: number; productive: number; expected: number; days: number }
  >()
  for (const m of cur.data ?? []) {
    const a = porUsuario.get(m.user_id) ?? { active: 0, productive: 0, expected: 0, days: 0 }
    a.active += m.active_seconds ?? 0
    a.productive += m.productive_seconds ?? 0
    a.expected += m.expected_seconds ?? 0
    a.days += 1
    porUsuario.set(m.user_id, a)
  }

  const rows = permitidos.map((u) => {
    const a = porUsuario.get(u.id ?? '')
    return {
      user_id: u.id,
      full_name: u.full_name ?? u.email,
      department: u.department || SIN_AREA,
      position: u.position,
      days_with_data: a?.days ?? 0,
      active_hours: Math.round(((a?.active ?? 0) / 3600) * 10) / 10,
      productive_hours: Math.round(((a?.productive ?? 0) / 3600) * 10) / 10,
      productivity_pct: a && a.active > 0 ? Math.round((a.productive / a.active) * 100) : null,
      compliance_pct: a && a.expected > 0 ? Math.round((a.active / a.expected) * 100) : null,
    }
  })
  rows.sort((x, y) => y.active_hours - x.active_hours)

  const val = (rs: { user_id: string; active_seconds: number | null }[]) =>
    rs.map((m) => ({ userId: m.user_id, value: (m.active_seconds ?? 0) / 3600 }))
  const cmp = comparar(agrupar(val(cur.data ?? [])), prev?.data ? agrupar(val(prev.data)) : null)

  return {
    type: 'overview' as const,
    rows,
    metricLabel: 'Horas activas',
    ...cmp,
    period: periodo,
    departments: departamentos,
  }
}
