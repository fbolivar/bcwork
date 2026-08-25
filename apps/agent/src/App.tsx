import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { AssignScreen } from './screens/AssignScreen'
import { ActiveScreen } from './screens/ActiveScreen'

// El helper solo tiene dos estados de UI: elegir usuario (una vez) o "activo".
// No hay pausa, ni salir, ni PIN: el monitoreo no lo controla el empleado.
export function App() {
  const [assigned, setAssigned] = useState(false)

  useEffect(() => {
    const unlisten = listen('assigned', () => setAssigned(true))
    return () => {
      void unlisten.then((u) => u())
    }
  }, [])

  if (assigned) return <ActiveScreen />
  return <AssignScreen onAssigned={() => setAssigned(true)} />
}
