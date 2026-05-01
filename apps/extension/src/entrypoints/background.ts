import { defineBackground } from 'wxt/sandbox'
import { getState, setState, pushEvent } from '../lib/storage'
import { sendBatch } from '../lib/sender'
import { classifyDomain, extractDomain } from '../lib/classifier'

// Rastreo de pestaña activa actual
interface ActiveTab {
  tabId: number
  url: string
  domain: string
  title: string
  startedAt: number // Date.now()
}

let activeTab: ActiveTab | null = null

export default defineBackground(() => {
  // ── Alarma de envío cada 5 minutos ───────────────────────────────────────
  chrome.alarms.create('bcwork_send', { periodInMinutes: 5 })
  chrome.alarms.create('bcwork_tick', { periodInMinutes: 1 })
  chrome.alarms.create('bcwork_rules', { periodInMinutes: 60 }) // sync reglas cada hora

  void syncDomainRules()

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'bcwork_send') void sendBatch()
    if (alarm.name === 'bcwork_tick') void tick()
    if (alarm.name === 'bcwork_rules') void syncDomainRules()
  })

  // ── Cambio de pestaña activa ──────────────────────────────────────────────
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab.url) return
      void handleTabChange(tabId, tab.url, tab.title ?? '')
    })
  })

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return
    if (!tab.active || !tab.url) return
    void handleTabChange(tabId, tab.url, tab.title ?? '')
  })

  // Cuando la ventana pierde foco (idle del navegador)
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      void flushActiveTab()
    }
  })

  // Detección de idle del sistema
  chrome.idle.setDetectionInterval(300) // 5 minutos
  chrome.idle.onStateChanged.addListener((state) => {
    if (state === 'idle' || state === 'locked') {
      void flushActiveTab()
    }
  })

  // Mensajes desde popup o content script
  chrome.runtime.onMessage.addListener((msg: Record<string, unknown>, _sender, sendResponse) => {
    if (msg['type'] === 'get_status') {
      void getState().then((s) => {
        sendResponse({
          paused: s.paused,
          enrolled: !!s.credentials,
          currentDomain: activeTab?.domain ?? null,
          pendingCount: s.pendingEvents.length,
          lastSentAt: s.lastSentAt,
          activeSeconds: s.session.activeSeconds,
          idleSeconds: s.session.idleSeconds,
        })
      })
      return true // async
    }

    if (msg['type'] === 'set_paused') {
      void setState({ paused: msg['paused'] as boolean })
      sendResponse({ ok: true })
    }

    if (msg['type'] === 'set_credentials') {
      void setState({
        credentials: msg['credentials'] as { serverUrl: string; apiKey: string; deviceId: string },
        session: {
          sessionId: null,
          startedAt: new Date().toISOString(),
          activeSeconds: 0,
          idleSeconds: 0,
        },
      })
      sendResponse({ ok: true })
    }

    if (msg['type'] === 'sync_rules') {
      void setState({ domainRules: msg['rules'] as Record<string, string> })
      sendResponse({ ok: true })
    }

    if (msg['type'] === 'send_now') {
      void sendBatch().then(() => sendResponse({ ok: true }))
      return true
    }
  })
})

async function handleTabChange(tabId: number, url: string, title: string): Promise<void> {
  const state = await getState()
  if (state.paused || !state.credentials) return

  // Ignorar páginas internas del navegador
  if (
    url.startsWith('chrome://') ||
    url.startsWith('about:') ||
    url.startsWith('moz-extension://')
  ) {
    await flushActiveTab()
    return
  }

  const domain = extractDomain(url)
  if (!domain) return

  // Flush pestaña anterior si existe y es diferente
  if (activeTab && (activeTab.tabId !== tabId || activeTab.url !== url)) {
    await flushActiveTab()
  }

  if (!activeTab) {
    activeTab = {
      tabId,
      url,
      domain,
      title,
      startedAt: Date.now(),
    }
    await setState({ currentDomain: domain })
  }
}

async function flushActiveTab(): Promise<void> {
  if (!activeTab) return

  const durationSeconds = Math.round((Date.now() - activeTab.startedAt) / 1000)

  // Ignorar visitas menores a 3 segundos (accidentales)
  if (durationSeconds < 3) {
    activeTab = null
    return
  }

  const state = await getState()
  const productivity = classifyDomain(activeTab.domain, state.domainRules)

  await pushEvent({
    eventType: 'web_visit',
    domain: activeTab.domain,
    url: activeTab.url,
    title: activeTab.title,
    productivity,
    startedAt: new Date(activeTab.startedAt).toISOString(),
    durationSeconds,
  })

  activeTab = null
  await setState({ currentDomain: null })
}

async function syncDomainRules(): Promise<void> {
  const state = await getState()
  if (!state.credentials) return

  try {
    const resp = await fetch(
      `${state.credentials.serverUrl.replace(/\/$/, '')}/api/ingest/domain-rules`,
      { headers: { Authorization: `Bearer ${state.credentials.apiKey}` } },
    )
    if (resp.ok) {
      const rules = (await resp.json()) as Record<string, string>
      await setState({ domainRules: rules })
    }
  } catch {
    // silencioso — usa reglas en caché
  }
}

async function tick(): Promise<void> {
  const state = await getState()
  if (state.paused || !state.credentials) return

  if (activeTab) {
    // Incrementar tiempo activo
    await setState({
      session: {
        ...state.session,
        activeSeconds: state.session.activeSeconds + 60,
      },
    })
  } else {
    // Incrementar tiempo idle
    await setState({
      session: {
        ...state.session,
        idleSeconds: state.session.idleSeconds + 60,
      },
    })
  }
}
