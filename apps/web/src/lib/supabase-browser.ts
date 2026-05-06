import { createClient } from '@supabase/supabase-js'
import type { Database } from '@bcwork/db'

let _client: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing Supabase browser config')
  _client = createClient<Database>(url, anon, {
    realtime: { params: { eventsPerSecond: 2 } },
  })
  return _client
}
