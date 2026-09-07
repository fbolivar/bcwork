import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { denyIfNotCron } from '@/lib/cron-auth'
import { enviarInformeProgramado, type ProgramacionFila } from '@/server/report-mailer'
import { proximaEjecucion } from '@/server/report-schedule'
import { offsetMinutes } from '@/lib/tz'

/**
 * Despacha los informes programados que ya vencieron.
 *
 * Corre cada hora. Las programaciones se crean con next_run_at calculado en la
 * zona del tenant; aquí solo se toma lo vencido, se envía y se reprograma.
 *
 * Se usa el cliente service_role a propósito: no hay usuario en una petición de
 * cron, y esto recorre varias empresas por diseño. Cada informe se calcula con
 * el tenant_id de su propia fila, nunca con uno recibido de fuera.
 */
export async function GET(req: NextRequest) {
  const deny = denyIfNotCron(req)
  if (deny) return deny

  const db = getDb()
  const ahora = new Date()

  const { data: pendientes, error } = await db
    .from('scheduled_reports')
    .select('*')
    .eq('is_active', true)
    .lte('next_run_at', ahora.toISOString())
    .limit(50)

  if (error) {
    console.error('[cron/scheduled-reports] consulta fallida:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let enviadas = 0
  let fallidas = 0
  const detalle: { id: string; name: string; resultado: string }[] = []

  for (const prog of (pendientes ?? []) as ProgramacionFila[]) {
    let resultado: string
    try {
      const r = await enviarInformeProgramado(db, prog, ahora)
      if (r.ok) {
        enviadas++
        resultado = `enviado a ${r.enviados}`
      } else {
        fallidas++
        resultado = r.motivo
      }
    } catch (e) {
      fallidas++
      resultado = e instanceof Error ? e.message : 'error desconocido'
      console.error(`[cron/scheduled-reports] ${prog.id} lanzó:`, e)
    }

    // Se reprograma pase lo que pase. Si un envío falla y no movemos la fecha,
    // el cron reintenta cada hora indefinidamente y el destinatario acaba con
    // una avalancha de correos el día que el fallo se arregle.
    const { data: t } = await db
      .from('tenants')
      .select('timezone')
      .eq('id', prog.tenant_id)
      .single()
    const tz = (t as { timezone?: string } | null)?.timezone ?? 'America/Bogota'
    const siguiente = proximaEjecucion(prog.cron_expression, ahora, offsetMinutes(ahora, tz))

    await db
      .from('scheduled_reports')
      .update({
        last_run_at: ahora.toISOString(),
        next_run_at: siguiente?.toISOString() ?? null,
        // Una frecuencia que no sabemos interpretar no se puede reprogramar:
        // se apaga en vez de quedar reintentando cada hora para siempre.
        ...(siguiente ? {} : { is_active: false }),
      })
      .eq('id', prog.id)

    detalle.push({ id: prog.id, name: prog.name, resultado })
  }

  console.log(
    `[cron/scheduled-reports] ${enviadas} enviadas, ${fallidas} fallidas de ${pendientes?.length ?? 0} vencidas`,
  )
  return NextResponse.json({
    ok: true,
    vencidas: pendientes?.length ?? 0,
    enviadas,
    fallidas,
    detalle,
  })
}
