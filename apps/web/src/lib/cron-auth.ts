import { NextResponse } from 'next/server'

/**
 * Autenticación de los jobs programados.
 *
 * Vercel invoca los crons con `Authorization: Bearer <CRON_SECRET>`, pero solo
 * si CRON_SECRET está definido en el proyecto. Si falta, no manda cabecera y el
 * job responde 401 en silencio: el cron figura como ejecutado y no hace nada.
 *
 * Eso fue exactamente lo que paso hasta el 2026-09-04 — los cinco crons llevaban
 * tiempo sin correr sin que nada lo delatara. Por eso la falta de configuración
 * se distingue del rechazo: 500 con mensaje explícito en vez de 401 mudo.
 *
 * Devuelve una respuesta de error, o null si la petición es legítima.
 */
export function denyIfNotCron(req: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET

  if (!expected) {
    console.error(
      '[cron] CRON_SECRET no está configurado: el job no puede autenticarse y no se ejecutará.',
    )
    return NextResponse.json(
      {
        error: 'cron_secret_missing',
        message: 'CRON_SECRET no está configurado en el entorno. El job no puede ejecutarse.',
      },
      { status: 500 },
    )
  }

  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return null
}
