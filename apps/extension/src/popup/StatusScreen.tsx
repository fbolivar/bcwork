interface BgStatus {
  paused: boolean
  enrolled: boolean
  currentDomain: string | null
  pendingCount: number
  lastSentAt: string | null
  activeSeconds: number
  idleSeconds: number
}

interface Props {
  status: BgStatus
  onTogglePause: () => void
  onSendNow: () => void
}

function fmt(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtTime(iso: string | null): string {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export function StatusScreen({ status, onTogglePause, onSendNow }: Props) {
  const total = status.activeSeconds + status.idleSeconds
  const pct = total > 0 ? Math.round((status.activeSeconds / total) * 100) : 0
  const tracking = !status.paused

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo />
          <span style={s.title}>BCWork Monitor</span>
        </div>
        <Dot active={tracking} />
      </div>

      {/* Dominio activo */}
      <div style={s.domain}>
        <span style={s.domainLabel}>Dominio activo</span>
        <span style={s.domainValue}>{status.currentDomain ?? '—'}</span>
      </div>

      {/* Stats */}
      <div style={s.grid}>
        <Stat label="Activo" value={fmt(status.activeSeconds)} color="#22c55e" />
        <Stat label="Inactivo" value={fmt(status.idleSeconds)} color="#64748b" />
      </div>

      {/* Barra de productividad */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
            fontSize: 11,
            color: '#64748b',
          }}
        >
          <span>Productividad de sesión</span>
          <span style={{ color: '#3b82f6', fontWeight: 600 }}>{pct}%</span>
        </div>
        <div style={s.bar}>
          <div style={{ ...s.fill, width: `${pct}%` }} />
        </div>
      </div>

      {/* Meta */}
      <div style={s.meta}>
        <span>Último envío: {fmtTime(status.lastSentAt)}</span>
        {status.pendingCount > 0 && (
          <span style={{ color: '#f59e0b' }}>{status.pendingCount} pendientes</span>
        )}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onTogglePause}
          style={{
            ...s.btn,
            flex: 1,
            background: tracking ? '#1e293b' : '#166534',
            color: tracking ? '#f87171' : '#86efac',
            border: `1px solid ${tracking ? '#f87171' : '#166534'}`,
          }}
        >
          {tracking ? 'Pausar' : 'Reanudar'}
        </button>
        <button
          onClick={onSendNow}
          style={{ ...s.btn, background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}
        >
          Enviar ahora
        </button>
      </div>

      <p style={s.legal}>Ley 2191/2022 · Ley 1581/2012</p>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={s.stat}>
      <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
    </div>
  )
}

function Dot({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: active ? '#22c55e' : '#f59e0b',
          boxShadow: `0 0 5px ${active ? '#22c55e' : '#f59e0b'}`,
        }}
      />
      <span style={{ fontSize: 11, color: active ? '#22c55e' : '#f59e0b' }}>
        {active ? 'Activo' : 'Pausado'}
      </span>
    </div>
  )
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#3b82f6" />
      <path
        d="M10 28V12l10 8 10-8v16"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: 700, color: '#f1f5f9' },
  domain: {
    background: '#1e293b',
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #334155',
  },
  domainLabel: { fontSize: 11, color: '#64748b' },
  domainValue: {
    fontSize: 13,
    fontWeight: 500,
    color: '#f1f5f9',
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  stat: {
    background: '#1e293b',
    borderRadius: 8,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    border: '1px solid #334155',
  },
  bar: { height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  fill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
    borderRadius: 3,
    transition: 'width 0.4s ease',
  },
  meta: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' },
  btn: { borderRadius: 7, padding: '9px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  legal: { fontSize: 10, color: '#334155', textAlign: 'center' },
}
