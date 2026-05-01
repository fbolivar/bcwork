/**
 * Sliding-window rate limiter — in-process, per Edge worker.
 * Para escala multi-instancia, reemplazar con Upstash Redis.
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, win] of store) {
    if (now > win.resetAt) store.delete(key)
  }
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // epoch seconds
}

export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  cleanup()
  const now = Date.now()
  const resetAt = now + windowSeconds * 1000
  const win = store.get(key)

  if (!win || now > win.resetAt) {
    store.set(key, { count: 1, resetAt })
    return { success: true, limit, remaining: limit - 1, reset: Math.ceil(resetAt / 1000) }
  }

  win.count++
  const remaining = Math.max(0, limit - win.count)
  return {
    success: win.count <= limit,
    limit,
    remaining,
    reset: Math.ceil(win.resetAt / 1000),
  }
}
