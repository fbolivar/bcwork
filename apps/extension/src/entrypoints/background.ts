import { defineBackground } from 'wxt/utils/define-background'
import { extractDomain } from '../lib/domain'

/**
 * Extensión BCWork: le cuenta al agente local qué dominio está activo.
 *
 * No habla con el servidor, no guarda credenciales, no cuenta tiempo. El
 * agente instalado en el equipo escucha en 127.0.0.1:47831 y adjunta el
 * dominio a las muestras de actividad que ya toma cada 10 s. Sin agente, la
 * extensión no hace nada.
 *
 * Solo se envía el dominio (`youtube.com`), nunca la URL completa.
 */

const AGENTE = 'http://127.0.0.1:47831'
const HEARTBEAT_MIN = 1 // el agente olvida un dominio a los 120 s sin noticias

let dominioActual: string | null = null
let agenteConectado = false
let ultimoReporte: string | null = null

async function reportar(domain: string | null): Promise<void> {
  try {
    const r = await fetch(`${AGENTE}/domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: domain ?? '', ua: navigator.userAgent }),
    })
    agenteConectado = r.ok
    if (r.ok) ultimoReporte = new Date().toISOString()
  } catch {
    agenteConectado = false
  }
}

async function pestanaActiva(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return tab ?? null
}

async function refrescar(): Promise<void> {
  const tab = await pestanaActiva()
  const dominio = tab?.url ? extractDomain(tab.url) : null
  dominioActual = dominio
  await reportar(dominio)
}

export default defineBackground(() => {
  chrome.alarms.create('bcwork_heartbeat', { periodInMinutes: HEARTBEAT_MIN })
  chrome.alarms.onAlarm.addListener((a) => {
    if (a.name === 'bcwork_heartbeat') void refrescar()
  })

  chrome.tabs.onActivated.addListener(() => void refrescar())
  chrome.tabs.onUpdated.addListener((_id, info, tab) => {
    if (info.url && tab.active) void refrescar()
  })
  chrome.windows.onFocusChanged.addListener((id) => {
    if (id === chrome.windows.WINDOW_ID_NONE) {
      dominioActual = null
      void reportar(null)
    } else {
      void refrescar()
    }
  })

  chrome.runtime.onMessage.addListener((msg: { type?: string }, _s, respond) => {
    if (msg.type === 'estado') {
      respond({ dominio: dominioActual, agente: agenteConectado, ultimo: ultimoReporte })
    }
  })

  void refrescar()
})
