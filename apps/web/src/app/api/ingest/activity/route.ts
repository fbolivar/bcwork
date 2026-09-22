import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/db'
import { resolveAgentKey, getBearer } from '@/lib/agent-auth'
import { resolverUbicacion } from '@/lib/ubicacion-ip'

const AgentEventSchema = z.object({
  event_type: z.string().min(1).max(50),
  app_identifier: z
    .string()
    .nullish()
    .transform((v) => v?.slice(0, 255) ?? null),
  domain: z
    .string()
    .nullish()
    .transform((v) => v?.slice(0, 255) ?? null),
  window_title: z
    .string()
    .nullish()
    .transform((v) => v?.slice(0, 500) ?? null),
  productivity: z.enum(['productive', 'unproductive', 'neutral', 'idle']).nullish(),
  started_at: z.string().datetime({ offset: true }),
  duration_seconds: z.number().int().min(0).max(86400),
  metadata: z.record(z.unknown()).nullish(),
})

const SessionStateSchema = z.object({
  session_id: z.string().nullish(),
  started_at: z.string().datetime({ offset: true }),
  ip: z.string().nullish(),
  is_active: z.boolean(),
  active_seconds: z.number().int().min(0),
  idle_seconds: z.number().int().min(0),
})

// Tope de inactividad por sesion: mas de una jornada entera no es informacion.
const MAX_IDLE_SECS = 16 * 3600

const BatchSchema = z.object({
  batch_id: z.string().min(1).max(100),
  events: z.array(AgentEventSchema).max(500),
  session_state: SessionStateSchema,
})

export async function POST(req: NextRequest) {
  const rawKey = getBearer(req)
  if (!rawKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = getDb()
  // La atribución del usuario proviene del device asignado (asignación 1-sola-vez).
  // Un device aún sin asignar (userId null) es rechazado más abajo.
  const identity = await resolveAgentKey(db, rawKey, 'ingest:activity')
  if (!identity) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = BatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { events, session_state } = parsed.data
  const now = new Date().toISOString()
  const { tenantId, userId: rawUserId, deviceId } = identity
  if (!rawUserId) return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })
  const userId: string = rawUserId

  const { data: deviceRow, error: deviceErr } = await db
    .from('agent_devices')
    .update({ last_seen_at: now })
    .eq('id', deviceId)
    .is('revoked_at', null)
    .select('pin_hash')
    .single()

  if (deviceErr) {
    return NextResponse.json({ error: 'device_revoked' }, { status: 401 })
  }
  const pinHash = (deviceRow as { pin_hash: string | null } | null)?.pin_hash ?? null

  // Upsert sesión activa
  let sessionId = session_state.session_id
  if (session_state.is_active) {
    if (sessionId) {
      await db
        .from('work_sessions')
        .update({
          active_seconds: session_state.active_seconds,
          idle_seconds: Math.min(session_state.idle_seconds, MAX_IDLE_SECS),
          last_seen_at: now,
        })
        .eq('id', sessionId)
        .eq('tenant_id', tenantId)
    } else {
      // Dos helpers a la vez (agentes viejos) abrian dos sesiones con el mismo
      // inicio. Si ya hay una abierta de este equipo para ese inicio, es esa.
      const { data: abierta } = await db
        .from('work_sessions')
        .select('id')
        .eq('device_id', deviceId)
        .is('ended_at', null)
        .gte('started_at', new Date(Date.parse(session_state.started_at) - 60_000).toISOString())
        .lte('started_at', new Date(Date.parse(session_state.started_at) + 60_000).toISOString())
        .order('started_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (abierta) {
        sessionId = abierta.id
        await db
          .from('work_sessions')
          .update({
            active_seconds: session_state.active_seconds,
            idle_seconds: Math.min(session_state.idle_seconds, MAX_IDLE_SECS),
            last_seen_at: now,
          })
          .eq('id', sessionId)
      }
    }
    if (!sessionId) {
      // Use the server-side public IP (x-forwarded-for) so it's geolocatable
      const publicIp =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        session_state.ip ??
        null

      // La IP se guardaba y nadie la cruzaba con los rangos corporativos de
      // TI & Seguridad > IPs, asi que ninguna sesion sabia si era oficina.
      const locationType = await resolverUbicacion(db, tenantId, publicIp)

      const { data: newSession } = await db
        .from('work_sessions')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          device_id: deviceId,
          started_at: session_state.started_at,
          active_seconds: session_state.active_seconds,
          idle_seconds: Math.min(session_state.idle_seconds, MAX_IDLE_SECS),
          ip_inet: publicIp,
          location_type: locationType,
          last_seen_at: now,
        })
        .select('id')
        .single()
      sessionId = newSession?.id
    }
  } else if (sessionId) {
    await db
      .from('work_sessions')
      .update({
        ended_at: now,
        active_seconds: session_state.active_seconds,
        idle_seconds: Math.min(session_state.idle_seconds, MAX_IDLE_SECS),
        last_seen_at: now,
      })
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
  }

  if (events.length > 0) {
    // Cargar catálogo de apps del tenant para clasificar automáticamente
    const appIds = [...new Set(events.map((e) => e.app_identifier).filter(Boolean))] as string[]
    const catalogMap = new Map<string, string>()
    if (appIds.length > 0) {
      const { data: catalog } = await db
        .from('app_catalog')
        .select('identifier, productivity')
        .eq('tenant_id', tenantId)
        .in('identifier', appIds)
      catalog?.forEach((r) => {
        if (r.productivity) catalogMap.set(r.identifier, r.productivity)
      })
    }

    // Los títulos de ventana solo se guardan si la empresa lo activó de forma
    // explícita: pueden contener datos de clientes, montos o salud, y la Ley
    // 1581 exige finalidad declarada. El agente los sigue enviando; el servidor
    // decide si se persisten.
    const { data: tenantCfg } = await db
      .from('tenants')
      .select('capture_window_titles')
      .eq('id', tenantId)
      .maybeSingle()
    const guardarTitulos = tenantCfg?.capture_window_titles === true

    // Reglas de dominio: cuando el evento trae el sitio (lo aporta la extensión
    // del navegador), manda la regla del dominio y no la del proceso. Si no,
    // todo lo que pase en Chrome heredaría la clase de Chrome.
    const dominios = [...new Set(events.map((e) => e.domain).filter(Boolean))] as string[]
    const reglasDominio: { identifier: string; productivity: string }[] = []
    if (dominios.length > 0) {
      const { data } = await db
        .from('app_catalog')
        .select('identifier, productivity')
        .eq('tenant_id', tenantId)
        .eq('identifier_type', 'domain')
      for (const r of data ?? []) if (r.productivity) reglasDominio.push(r)
      // Las más específicas primero: "mail.google.com" gana a "google.com".
      reglasDominio.sort((a, b) => b.identifier.length - a.identifier.length)
    }
    const clasePorDominio = (d: string | null | undefined): string | null => {
      if (!d) return null
      const regla = reglasDominio.find((r) => d === r.identifier || d.endsWith(`.${r.identifier}`))
      return regla?.productivity ?? null
    }

    // Una muestra por dispositivo e intervalo de 10 s. Un agente viejo con
    // dos helpers manda el doble; el reenvio de un lote no confirmado, lo
    // mismo. Se descarta lo que ya esta (en el lote o en la base).
    const slot = (iso: string) => Math.floor(Date.parse(iso) / 10_000)
    const tiempos = events.map((e) => Date.parse(e.started_at))
    const { data: previas } = await db
      .from('activity_events')
      .select('started_at')
      .eq('device_id', deviceId)
      .gte('started_at', new Date(Math.min(...tiempos) - 10_000).toISOString())
      .lte('started_at', new Date(Math.max(...tiempos) + 10_000).toISOString())
    const vistos = new Set((previas ?? []).map((p) => slot(p.started_at)))
    const unicos = events
      .slice()
      .sort((a, b) => (a.domain ? 0 : 1) - (b.domain ? 0 : 1)) // con dominio primero
      .filter((e) => {
        const k = slot(e.started_at)
        if (vistos.has(k)) return false
        vistos.add(k)
        return true
      })
    if (unicos.length < events.length) {
      console.warn(
        `[ingest] ${events.length - unicos.length} muestras duplicadas descartadas (device ${deviceId})`,
      )
    }

    const rows = unicos.map((e) => ({
      tenant_id: tenantId,
      user_id: userId,
      device_id: deviceId,
      session_id: sessionId ?? null,
      event_type: e.event_type,
      app_identifier: e.app_identifier ?? null,
      domain: e.domain ?? null,
      window_title: guardarTitulos ? (e.window_title ?? null) : null,
      productivity:
        clasePorDominio(e.domain) ??
        (e.app_identifier && catalogMap.get(e.app_identifier)) ??
        e.productivity ??
        null,
      started_at: e.started_at,
      duration_seconds: e.duration_seconds,
      metadata: (e.metadata ??
        null) as import('@bcwork/db').Database['public']['Tables']['activity_events']['Insert']['metadata'],
    }))

    const { error: insertErr } =
      rows.length > 0 ? await db.from('activity_events').insert(rows) : { error: null }
    if (insertErr) {
      console.error('[ingest] activity insert failed:', insertErr.message)
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, session_id: sessionId ?? null, pin_hash: pinHash })
}
