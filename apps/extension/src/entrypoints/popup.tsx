import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { SetupScreen } from '../popup/SetupScreen'
import { StatusScreen } from '../popup/StatusScreen'

interface BgStatus {
  paused: boolean
  enrolled: boolean
  currentDomain: string | null
  pendingCount: number
  lastSentAt: string | null
  activeSeconds: number
  idleSeconds: number
}

function sendMsg<T>(msg: Record<string, unknown>): Promise<T> {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve))
}

function App() {
  const [status, setStatus] = useState<BgStatus | null>(null)

  const refresh = () => {
    sendMsg<BgStatus>({ type: 'get_status' }).then(setStatus)
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 2000)
    return () => clearInterval(id)
  }, [])

  if (!status) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
        Cargando...
      </div>
    )
  }

  if (!status.enrolled) {
    return (
      <SetupScreen
        onSaved={() => {
          refresh()
        }}
      />
    )
  }

  return (
    <StatusScreen
      status={status}
      onTogglePause={() => {
        sendMsg({ type: 'set_paused', paused: !status.paused }).then(refresh)
      }}
      onSendNow={() => {
        sendMsg({ type: 'send_now' }).then(refresh)
      }}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
