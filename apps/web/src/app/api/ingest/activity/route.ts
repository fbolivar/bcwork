import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { getDb } from '@/lib/db'

const AgentEventSchema = z.object({
  event_type: z.string().min(1).max(50),
  app_identifier: z.string().max(255).nullish(),
  domain: z.string().max(255).nullish(),
  window_title: z.string().max(500).nullish(),
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

const BatchSchema = z.object({
  batch_id: z.string().min(1).max(100),
  events: z.array(AgentEventSchema).max(500),
  session_state: SessionStateSchema,
})

async function resolveApiKey(
  db: ReturnType<typeof import('@/lib/db').getDb>,
  rawKey: string,
): Promise<{ tenantId: string; userId: string; deviceId: string } | null> {
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { data } = await db
    .from('api_keys')
    .select('id, tenant_id, created_by, name, scopes, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  const scopes = data.scopes as string[]
  if (!scopes.includes('ingest:activity')) return null

  const deviceId = (data.name as string).replace('agent:', '')

  if (!data.created_by) return null
  await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)

  return { tenantId: data.tenant_id, userId: data.created_by, deviceId }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const rawKey = authHeader.slice(7)

  const db = getDb()
  const identity = await resolveApiKey(db, rawKey)
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
          idle_seconds: session_state.idle_seconds,
        })
        .eq('id', sessionId)
        .eq('tenant_id', tenantId)
    } else {
      const { data: newSession } = await db
        .from('work_sessions')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          device_id: deviceId,
          started_at: session_state.started_at,
          active_seconds: session_state.active_seconds,
          idle_seconds: session_state.idle_seconds,
          ip_inet: session_state.ip ?? null,
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
        idle_seconds: session_state.idle_seconds,
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

    const rows = events.map((e) => ({
      tenant_id: tenantId,
      user_id: userId,
      device_id: deviceId,
      session_id: sessionId ?? null,
      event_type: e.event_type,
      app_identifier: e.app_identifier ?? null,
      domain: e.domain ?? null,
      window_title: e.window_title ?? null,
      productivity:
        (e.app_identifier && catalogMap.get(e.app_identifier)) ?? e.productivity ?? null,
      started_at: e.started_at,
      duration_seconds: e.duration_seconds,
      metadata: (e.metadata ??
        null) as import('@bcwork/db').Database['public']['Tables']['activity_events']['Insert']['metadata'],
    }))

    const { error: insertErr } = await db.from('activity_events').insert(rows)
    if (insertErr) {
      console.error('[ingest] activity insert failed:', insertErr.message)
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, session_id: sessionId ?? null, pin_hash: pinHash })
}
