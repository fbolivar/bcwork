import { createHmac } from 'crypto'
import { getDb } from './db'

export interface WebhookPayload {
  event: string
  timestamp: string
  tenant_id: string
  data: unknown
}

export async function dispatchWebhook(
  tenantId: string,
  event: string,
  data: unknown,
): Promise<void> {
  const db = getDb()
  const { data: hooks } = await db
    .from('webhooks')
    .select('id, url, secret, events')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (!hooks || hooks.length === 0) return

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    tenant_id: tenantId,
    data,
  }
  const body = JSON.stringify(payload)

  await Promise.allSettled(
    hooks
      .filter((h) => (h.events as string[]).length === 0 || (h.events as string[]).includes(event))
      .map(async (hook) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'BCWork-Webhook/1.0',
          'X-BCWork-Event': event,
          'X-BCWork-Timestamp': payload.timestamp,
        }

        if (hook.secret) {
          const sig = createHmac('sha256', hook.secret).update(body).digest('hex')
          headers['X-BCWork-Signature'] = `sha256=${sig}`
        }

        let statusCode: number | null = null
        let errorMsg: string | null = null

        try {
          const res = await fetch(hook.url, {
            method: 'POST',
            headers,
            body,
            signal: AbortSignal.timeout(10000),
          })
          statusCode = res.status
        } catch (err) {
          errorMsg = err instanceof Error ? err.message : String(err)
        }

        await Promise.all([
          db.from('webhook_deliveries').insert({
            webhook_id: hook.id,
            tenant_id: tenantId,
            event,
            payload,
            status_code: statusCode,
            error: errorMsg,
          }),
          db
            .from('webhooks')
            .update({
              last_called_at: new Date().toISOString(),
              last_status_code: statusCode,
            })
            .eq('id', hook.id),
        ])
      }),
  )
}
