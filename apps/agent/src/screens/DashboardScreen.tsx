import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface AgentStatus {
  enrolled: boolean
  paused: boolean
  active_seconds: number
  idle_seconds: number
  current_app: string | null
  last_sent_at: string | null
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatTime(iso: string | null): string {
  if (!iso) return 'Nunca'
  const d = new Date(iso)
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export function DashboardScreen() {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const refresh = async () => {
      const [s, count] = await Promise.all([
        invoke<AgentStatus>('get_status'),
        invoke<number>('get_events_count'),
      ])
      setStatus(s)
      setPendingCount(count)
    }
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  const togglePause = async () => {
    if (!status) return
    await invoke('set_paused', { paused: !status.paused })
    setStatus((s) => (s ? { ...s, paused: !s.paused } : s))
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
      <div style={styles.header}>
        <div style={styles.logo}>
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="#3b82f6" />
            <path
              d="M10 28V12l10 8 10-8v16"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={styles.logoText}>BCWork Agent</span>
        </div>
        <StatusDot active={trackingActive} />
      </div>

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

      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>Productividad de sesión</span>
          <span style={styles.progressValue}>{activePercent}%</span>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${activePercent}%` }} />
        </div>
      </div>

      {status.current_app && (
        <div style={styles.currentApp}>
          <span style={styles.currentAppLabel}>Aplicación activa</span>
          <span style={styles.currentAppName}>{status.current_app}</span>
        </div>
      )}

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

      <button
        onClick={togglePause}
        style={{
          ...styles.pauseButton,
          background: trackingActive ? '#1e293b' : '#16a34a',
          color: trackingActive ? '#f87171' : 'white',
          border: trackingActive ? '1px solid #f87171' : '1px solid #16a34a',
        }}
      >
        {trackingActive ? 'Pausar monitoreo' : 'Reanudar monitoreo'}
      </button>

      <p style={styles.legal}>
        Monitoreo conforme a Ley 2191/2022 (Desconexión Digital) y Ley 1581/2012 (HABEAS DATA)
      </p>
    </div>
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0f172a',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoText: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#f1f5f9',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  statCard: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    border: '1px solid #334155',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  progressSection: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #334155',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  progressLabel: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  progressValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#3b82f6',
  },
  progressBar: {
    height: '6px',
    background: '#0f172a',
    borderRadius: '3px',
    overflow: 'hidden',
  },
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
  currentAppLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  currentAppName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#f1f5f9',
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
