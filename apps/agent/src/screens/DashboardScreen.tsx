import { useEffect, useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

interface AgentStatus {
  enrolled: boolean
  paused: boolean
  active_seconds: number
  idle_seconds: number
  current_app: string | null
  last_sent_at: string | null
  pin_required: boolean
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatTime(iso: string | null): string {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

// ── PIN Dialog ────────────────────────────────────────────────────────────────
function PinDialog({
  title,
  onConfirm,
  onCancel,
}: {
  title: string
  onConfirm: (pin: string) => void
  onCancel: () => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <LockIcon />
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>{title}</span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
          Ingresa el PIN de administrador para continuar.
        </p>
        <input
          type="password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (pin.length < 4) {
                setError('PIN muy corto')
                return
              }
              onConfirm(pin)
            }
          }}
          placeholder="••••••"
          autoFocus
          maxLength={12}
          style={{
            width: '100%',
            background: '#0f172a',
            border: `1px solid ${error ? '#f87171' : '#334155'}`,
            borderRadius: 8,
            padding: '10px 14px',
            color: '#f1f5f9',
            fontSize: 20,
            letterSpacing: 6,
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <p style={{ color: '#f87171', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (pin.length < 4) {
                setError('PIN muy corto')
                return
              }
              onConfirm(pin)
            }}
            style={{
              flex: 1,
              padding: '10px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardScreen({ onUnenroll }: { onUnenroll?: () => void }) {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [pinDialog, setPinDialog] = useState<'pause' | 'quit' | 'unenroll' | null>(null)
  const [pinError, setPinError] = useState('')

  const refresh = useCallback(async () => {
    const [s, count] = await Promise.all([
      invoke<AgentStatus>('get_status'),
      invoke<number>('get_events_count'),
    ])
    setStatus(s)
    setPendingCount(count)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  // Listen for tray events
  useEffect(() => {
    const unlistenPause = listen('tray-pause-requested', () => {
      if (status?.pin_required) {
        setPinDialog('pause')
      } else {
        void invoke('set_paused', { paused: !status?.paused }).then(refresh)
      }
    })
    const unlistenQuit = listen('tray-quit-requested', () => {
      if (status?.pin_required) {
        setPinDialog('quit')
      } else {
        void exit(0)
      }
    })
    return () => {
      void unlistenPause.then((u) => u())
      void unlistenQuit.then((u) => u())
    }
  }, [status, refresh])

  const requestPause = () => {
    if (!status) return
    if (status.pin_required) {
      setPinDialog('pause')
    } else {
      void invoke('set_paused', { paused: !status.paused }).then(refresh)
    }
  }

  const handlePinConfirm = async (pin: string) => {
    const ok = await invoke<boolean>('verify_pin', { pin })
    if (!ok) {
      setPinError('PIN incorrecto')
      return
    }
    if (pinDialog === 'pause') {
      await invoke('set_paused', { paused: !status?.paused })
      await refresh()
    } else if (pinDialog === 'quit') {
      await invoke('quit_app')
    } else if (pinDialog === 'unenroll') {
      await invoke('unenroll')
      onUnenroll?.()
    }
    setPinDialog(null)
    setPinError('')
  }

  if (!status) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#94a3b8' }}>Cargando...</p>
      </div>
    )
  }

  const trackingActive = !status.paused
  const totalSecs = status.active_seconds + status.idle_seconds
  const activePercent = totalSecs > 0 ? Math.round((status.active_seconds / totalSecs) * 100) : 0

  return (
    <div style={styles.container}>
      {pinDialog && (
        <PinDialog
          title={
            pinDialog === 'pause'
              ? 'Pausar monitoreo'
              : pinDialog === 'unenroll'
                ? 'Desenrolar dispositivo'
                : 'Cerrar agente'
          }
          onConfirm={handlePinConfirm}
          onCancel={() => {
            setPinDialog(null)
            setPinError('')
          }}
        />
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <BcworkIcon />
          <span style={styles.logoText}>BCWork Agent</span>
        </div>
        <StatusDot active={trackingActive} />
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <StatCard
          label="Tiempo activo"
          value={formatDuration(status.active_seconds)}
          color="#22c55e"
        />
        <StatCard
          label="Tiempo inactivo"
          value={formatDuration(status.idle_seconds)}
          color="#94a3b8"
        />
      </div>

      {/* Productivity */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>Productividad de sesión</span>
          <span style={styles.progressValue}>{activePercent}%</span>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${activePercent}%` }} />
        </div>
      </div>

      {/* Current app */}
      {status.current_app && (
        <div style={styles.currentApp}>
          <span style={styles.currentAppLabel}>Aplicación activa</span>
          <span style={styles.currentAppName}>{status.current_app}</span>
        </div>
      )}

      {/* Meta */}
      <div style={styles.meta}>
        <span style={{ color: '#64748b', fontSize: '12px' }}>
          Último envío: {formatTime(status.last_sent_at)}
        </span>
        {pendingCount > 0 && (
          <span style={{ color: '#f59e0b', fontSize: '12px' }}>
            {pendingCount} eventos pendientes
          </span>
        )}
      </div>

      {/* Pause button */}
      <button
        onClick={requestPause}
        style={{
          ...styles.pauseButton,
          background: trackingActive ? '#1e293b' : '#16a34a',
          color: trackingActive ? '#f87171' : 'white',
          border: trackingActive ? '1px solid #f87171' : '1px solid #16a34a',
        }}
      >
        {status.pin_required && '🔒 '}
        {trackingActive ? 'Pausar monitoreo' : 'Reanudar monitoreo'}
      </button>

      <button
        onClick={() => {
          if (status?.pin_required) {
            setPinDialog('unenroll')
          } else if (confirm('¿Desenrolar este dispositivo? Deberás ingresar un nuevo código.')) {
            void invoke('unenroll').then(() => onUnenroll?.())
          }
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#475569',
          fontSize: '11px',
          cursor: 'pointer',
          textDecoration: 'underline',
          padding: '4px',
        }}
      >
        Desenrolar dispositivo
      </button>

      <p style={styles.legal}>
        Monitoreo conforme a Ley 2191/2022 (Desconexión Digital) y Ley 1581/2012 (HABEAS DATA)
      </p>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function BcworkIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="512" height="512" rx="96" fill="url(#gi)" />
      <defs>
        <linearGradient id="gi" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="ga" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <polygon
        points="256,72 406,162 406,350 256,440 106,350 106,162"
        fill="none"
        stroke="url(#ga)"
        strokeWidth="6"
        opacity="0.9"
      />
      <rect x="176" y="172" width="22" height="168" rx="8" fill="url(#ga)" />
      <path
        d="M198 172 Q272 172 272 214 Q272 256 198 256"
        fill="none"
        stroke="url(#ga)"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M198 256 Q284 256 284 298 Q284 340 198 340"
        fill="none"
        stroke="url(#ga)"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <polyline
        points="290,256 310,256 322,228 338,290 350,240 366,256 386,256"
        fill="none"
        stroke="#06b6d4"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="#94a3b8" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.5" fill="#94a3b8" />
    </svg>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={styles.statCard}>
      <span style={{ ...styles.statValue, color }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  )
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: active ? '#22c55e' : '#f59e0b',
          boxShadow: active ? '0 0 6px #22c55e' : '0 0 6px #f59e0b',
        }}
      />
      <span style={{ fontSize: '12px', color: active ? '#22c55e' : '#f59e0b' }}>
        {active ? 'Activo' : 'Pausado'}
      </span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
}

const dialogStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 16,
  padding: 24,
  width: 320,
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0f172a',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoText: { fontSize: '16px', fontWeight: 700, color: '#f1f5f9' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  statCard: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    border: '1px solid #334155',
  },
  statValue: { fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  statLabel: { fontSize: '12px', color: '#64748b' },
  progressSection: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  progressHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  progressLabel: { fontSize: '13px', color: '#94a3b8' },
  progressValue: { fontSize: '13px', fontWeight: 600, color: '#3b82f6' },
  progressBar: { height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden' },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
    borderRadius: '3px',
    transition: 'width 0.5s ease',
  },
  currentApp: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid #334155',
  },
  currentAppLabel: { fontSize: '12px', color: '#64748b' },
  currentAppName: { fontSize: '13px', fontWeight: 500, color: '#f1f5f9' },
  meta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  pauseButton: {
    borderRadius: '10px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  },
  legal: {
    fontSize: '11px',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 1.5,
    marginTop: 'auto',
  },
}
