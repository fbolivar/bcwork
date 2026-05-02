import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { EnrollScreen } from './screens/EnrollScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { getStore } from './lib/store'

export function App() {
  const [enrolled, setEnrolled] = useState<boolean | null>(null)

  useEffect(() => {
    getStore().then((store) => {
      store.get<string>('api_key').then((key) => {
        setEnrolled(!!key)
      })
    })
  }, [])

  // Volver al EnrollScreen cuando el servidor rechaza las credenciales
  useEffect(() => {
    const unlisten = listen('agent-unenrolled', () => {
      setEnrolled(false)
    })
    return () => {
      void unlisten.then((u) => u())
    }
  }, [])

  if (enrolled === null) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}
      >
        <Spinner />
      </div>
    )
  }

  if (!enrolled) {
    return <EnrollScreen onEnrolled={() => setEnrolled(true)} />
  }

  return <DashboardScreen onUnenroll={() => setEnrolled(false)} />
}

function Spinner() {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '3px solid #334155',
        borderTopColor: '#3b82f6',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  )
}
