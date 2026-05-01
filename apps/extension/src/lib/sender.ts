import { getState, markEventsSent, setState } from './storage'

const BATCH_SIZE = 500

export async function sendBatch(): Promise<void> {
  const state = await getState()

  if (!state.credentials || state.paused) return

  const events = await (await import('./storage')).popEvents(BATCH_SIZE)
  if (events.length === 0 && state.session.activeSeconds === 0) return

  const { serverUrl, apiKey } = state.credentials
  const { session } = state

  const payload = {
    batch_id: crypto.randomUUID(),
    events: events.map((e) => ({
      event_type: e.eventType,
      domain: e.domain,
      window_title: e.title,
      ...(e.productivity ? { productivity: e.productivity } : {}),
      started_at: e.startedAt,
      duration_seconds: e.durationSeconds,
      metadata: { url: e.url, source: 'extension' },
    })),
    session_state: {
      ...(session.sessionId ? { session_id: session.sessionId } : {}),
      started_at: session.startedAt,
      is_active: true,
      active_seconds: session.activeSeconds,
      idle_seconds: session.idleSeconds,
    },
  }

  try {
    const resp = await fetch(`${serverUrl.replace(/\/$/, '')}/api/ingest/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (resp.ok) {
      const body = (await resp.json()) as { session_id?: string }
      await markEventsSent(events.length)
      await setState({
        lastSentAt: new Date().toISOString(),
        session: {
          ...state.session,
          ...(body.session_id ? { sessionId: body.session_id } : {}),
        },
      })
    } else {
      console.error('[bcwork] batch rejected:', resp.status)
    }
  } catch (err) {
    console.error('[bcwork] batch send error:', err)
  }
}
