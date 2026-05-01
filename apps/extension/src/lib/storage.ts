export interface Credentials {
  serverUrl: string
  apiKey: string
  deviceId: string
}

export interface SessionState {
  sessionId: string | null
  startedAt: string
  activeSeconds: number
  idleSeconds: number
}

export interface BufferedEvent {
  eventType: string
  domain: string
  url: string
  title: string
  productivity: string | null
  startedAt: string
  durationSeconds: number
}

export interface ExtState {
  paused: boolean
  credentials: Credentials | null
  session: SessionState
  pendingEvents: BufferedEvent[]
  lastSentAt: string | null
  currentDomain: string | null
  domainRules: Record<string, string> // domain -> productivity
}

const DEFAULT_STATE: ExtState = {
  paused: false,
  credentials: null,
  session: {
    sessionId: null,
    startedAt: new Date().toISOString(),
    activeSeconds: 0,
    idleSeconds: 0,
  },
  pendingEvents: [],
  lastSentAt: null,
  currentDomain: null,
  domainRules: {},
}

export async function getState(): Promise<ExtState> {
  const result = await chrome.storage.local.get('bcwork_state')
  return { ...DEFAULT_STATE, ...(result['bcwork_state'] as Partial<ExtState> | undefined) }
}

export async function setState(patch: Partial<ExtState>): Promise<void> {
  const current = await getState()
  await chrome.storage.local.set({ bcwork_state: { ...current, ...patch } })
}

export async function pushEvent(event: BufferedEvent): Promise<void> {
  const state = await getState()
  const events = [...state.pendingEvents, event]
  // Mantener máximo 2000 eventos en buffer
  const trimmed = events.length > 2000 ? events.slice(events.length - 2000) : events
  await setState({ pendingEvents: trimmed })
}

export async function popEvents(limit: number): Promise<BufferedEvent[]> {
  const state = await getState()
  return state.pendingEvents.slice(0, limit)
}

export async function markEventsSent(count: number): Promise<void> {
  const state = await getState()
  await setState({ pendingEvents: state.pendingEvents.slice(count) })
}
