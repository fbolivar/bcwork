import { Resend } from 'resend'
import { runReport, type ReportType } from './reports'
import { periodoDeEnvio, describirFrecuencia } from './report-schedule'
import { buildXlsx, type Sheet, type CellValue } from '@/lib/xlsx'
import type { getDb } from '@/lib/db'

type Db = ReturnType<typeof getDb>

/**
 * Envío de un informe programado por correo.
 *
 * Vive aparte del cron porque el panel también permite mandar una programación
 * al instante para probarla, y el peor resultado posible sería que el correo de
 * prueba y el automático no fueran el mismo correo.
 *
 * El informe va como .xlsx adjunto y el cuerpo lleva el comparativo por área,
 * que es lo que se alcanza a leer desde el teléfono sin abrir el adjunto.
 */

export interface ProgramacionFila {
  id: string
  tenant_id: string
  name: string
  report_type: string
  cron_expression: string
  recipients: string[]
  filters: unknown
  format: string | null
}

export type ResultadoEnvio =
  | { ok: true; enviados: number; from: string; to: string }
  | { ok: false; motivo: string }

const ETIQUETAS: Record<string, string> = {
  overview: 'Resumen general',
  attendance: 'Asistencia',
  productivity: 'Productividad',
  absences: 'Ausencias',
  payroll: 'Nómina',
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmt(v: number | null, dinero: boolean) {
  if (v == null) return '—'
  return dinero
    ? v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
    : v.toLocaleString('es-CO', { maximumFractionDigits: 1 })
}

export async function enviarInformeProgramado(
  db: Db,
  prog: ProgramacionFila,
  ahora: Date,
): Promise<ResultadoEnvio> {
  if (!process.env.RESEND_API_KEY) return { ok: false, motivo: 'RESEND_API_KEY no configurada' }
  if (!prog.recipients?.length)
    return { ok: false, motivo: 'La programación no tiene destinatarios' }

  const periodo = periodoDeEnvio(prog.cron_expression, ahora)
  if (!periodo) {
    return { ok: false, motivo: `Frecuencia no soportada: ${prog.cron_expression}` }
  }

  const department =
    prog.filters && typeof prog.filters === 'object' && 'department' in prog.filters
      ? String((prog.filters as { department: unknown }).department)
      : undefined

  const informe = await runReport(db, prog.tenant_id, {
    report_type: prog.report_type as ReportType,
    date_from: periodo.from,
    date_to: periodo.to,
    ...(department ? { department } : {}),
  })

  const { data: empresa } = await db
    .from('tenants')
    .select('legal_name, trade_name')
    .eq('id', prog.tenant_id)
    .single()
  const nombreEmpresa = empresa?.trade_name ?? empresa?.legal_name ?? 'Su empresa'

  const dinero = prog.report_type === 'payroll'
  const etiqueta = ETIQUETAS[prog.report_type] ?? prog.report_type
  const dias = `${periodo.from.slice(0, 10)} al ${periodo.to.slice(0, 10)}`

  // ── Adjunto ──
  const hojas: Sheet[] = []
  if (informe.groups.length) {
    hojas.push({
      name: 'Resumen',
      header: ['Departamento', 'Personas', informe.metricLabel, 'Período anterior', 'Variación %'],
      rows: [
        ...informe.groups.map((g): CellValue[] => [
          g.department,
          g.people,
          g.value,
          g.previousValue,
          g.deltaPct,
        ]),
        [
          'TOTAL',
          null,
          informe.totals.value,
          informe.totals.previousValue,
          informe.totals.deltaPct,
        ] as CellValue[],
      ],
    })
  }
  const filas = informe.rows as Record<string, unknown>[]
  if (filas.length) {
    const cols = Object.keys(filas[0]!).filter((k) => typeof filas[0]![k] !== 'object')
    hojas.push({
      name: 'Detalle',
      header: cols,
      rows: filas.map((r) =>
        cols.map((c): CellValue => {
          const v = r[c]
          return typeof v === 'number' || typeof v === 'string' ? v : v == null ? null : String(v)
        }),
      ),
    })
  }

  if (!hojas.length) {
    // Un correo con un adjunto vacío es peor que ninguno: parece un fallo del
    // sistema cuando en realidad no hubo actividad que reportar.
    return { ok: false, motivo: `Sin datos para el período ${dias}` }
  }

  const xlsx = Buffer.from(await buildXlsx(hojas).arrayBuffer())

  // ── Cuerpo ──
  const filasHtml = informe.groups
    .map(
      (g) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9">${esc(g.department)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:right">${fmt(g.value, dinero)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#64748b">${fmt(g.previousValue, dinero)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:right;color:${
          g.deltaPct == null ? '#cbd5e1' : g.deltaPct >= 0 ? '#059669' : '#e11d48'
        }">${g.deltaPct == null ? 'sin base' : `${g.deltaPct > 0 ? '+' : ''}${g.deltaPct}%`}</td>
      </tr>`,
    )
    .join('')

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;max-width:640px">
    <h2 style="margin:0 0 4px;font-size:18px">${esc(etiqueta)} · ${esc(nombreEmpresa)}</h2>
    <p style="margin:0 0 16px;color:#64748b;font-size:13px">
      Período ${dias}${department ? ` · ${esc(department)}` : ''}<br/>
      ${esc(describirFrecuencia(prog.cron_expression))}
    </p>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <thead><tr style="background:#f8fafc">
        <th style="padding:6px 10px;text-align:left;color:#64748b;font-weight:600">Departamento</th>
        <th style="padding:6px 10px;text-align:right;color:#64748b;font-weight:600">${esc(informe.metricLabel)}</th>
        <th style="padding:6px 10px;text-align:right;color:#64748b;font-weight:600">Anterior</th>
        <th style="padding:6px 10px;text-align:right;color:#64748b;font-weight:600">Variación</th>
      </tr></thead>
      <tbody>${filasHtml}
        <tr style="background:#f8fafc;font-weight:700">
          <td style="padding:6px 10px">Total</td>
          <td style="padding:6px 10px;text-align:right">${fmt(informe.totals.value, dinero)}</td>
          <td style="padding:6px 10px;text-align:right">${fmt(informe.totals.previousValue, dinero)}</td>
          <td style="padding:6px 10px;text-align:right">${
            informe.totals.deltaPct == null
              ? 'sin base'
              : `${informe.totals.deltaPct > 0 ? '+' : ''}${informe.totals.deltaPct}%`
          }</td>
        </tr>
      </tbody>
    </table>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">
      El detalle completo va en el archivo adjunto. Enviado automáticamente por BCWork.
    </p>
  </div>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const archivo = `bcwork-${prog.report_type}-${periodo.from.slice(0, 10)}-${periodo.to.slice(0, 10)}.xlsx`

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'BCWork <no-reply@bcwork.co>',
    to: prog.recipients,
    subject: `${etiqueta} · ${nombreEmpresa} (${dias})`,
    html,
    attachments: [{ filename: archivo, content: xlsx }],
  })

  if (error) return { ok: false, motivo: error.message ?? 'Resend rechazó el envío' }
  return { ok: true, enviados: prog.recipients.length, from: periodo.from, to: periodo.to }
}
