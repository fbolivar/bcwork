const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Sends a Realtime broadcast to a user-specific channel.
 * Fire-and-forget — never throws, so callers don't need try/catch.
 */
export function broadcastNotification(userId: string): void {
  if (!SUPABASE_URL || !SERVICE_KEY) return
  const url = `${SUPABASE_URL}/realtime/v1/api/broadcast`
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({
      messages: [
        {
          topic: `realtime:notifications:${userId}`,
          event: 'new_notification',
          payload: {},
        },
      ],
    }),
  }).catch(() => {
    // Realtime broadcast failure is non-critical — polling is the fallback
  })
}

/**
 * Broadcasts to multiple users concurrently.
 */
export function broadcastNotificationToMany(userIds: string[]): void {
  userIds.forEach((id) => broadcastNotification(id))
}
