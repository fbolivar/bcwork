import { createClient as _createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export function createClient(supabaseUrl: string, supabaseKey: string) {
  return _createClient<Database>(supabaseUrl, supabaseKey)
}
