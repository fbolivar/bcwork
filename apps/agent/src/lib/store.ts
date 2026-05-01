import { load } from '@tauri-apps/plugin-store'

let _store: Awaited<ReturnType<typeof load>> | null = null

export async function getStore() {
  if (!_store) {
    _store = await load('credentials.json', { autoSave: true })
  }
  return _store
}
