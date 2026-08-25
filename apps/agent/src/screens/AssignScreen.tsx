import { useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface RosterUser {
  id: string
  full_name: string | null
  email: string
}

interface Props {
  onAssigned: () => void
}

// Picker "elige tu nombre 1 vez". Aparece una sola vez tras instalar el agente.
export function AssignScreen({ onAssigned }: Props) {
  const [users, setUsers] = useState<RosterUser[]>([])
  const [status, setStatus] = useState<'loading' | 'waiting' | 'pick' | 'error'>('loading')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await invoke<{ status: string; users?: RosterUser[] }>('get_assign_state')
      if (res.status === 'active') {
        onAssigned()
      } else if (res.status === 'waiting') {
        setStatus('waiting')
      } else if (res.status === 'pick') {
        setUsers(res.users ?? [])
        setStatus('pick')
      }
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }

  useEffect(() => {
    void load()
    // Reintentar mientras el servicio termina de aprovisionar.
    const t = setInterval(() => {
      if (status === 'waiting' || status === 'error') void load()
    }, 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => (u.full_name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, query])

  const confirm = async () => {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      await invoke('assign_me', { userId: selected })
      onAssigned()
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
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

        {status === 'loading' && <p style={styles.subtitle}>Cargando…</p>}

        {status === 'waiting' && (
          <p style={styles.subtitle}>
            Activando el agente en este equipo… Esto toma unos segundos tras la instalación.
          </p>
        )}

        {status === 'error' && (
          <p style={styles.subtitle}>
            No se pudo contactar al servidor. Reintentando automáticamente…
          </p>
        )}

        {status === 'pick' && (
          <>
            <p style={styles.subtitle}>
              Para activar el monitoreo, selecciona tu nombre. Esto se hace una sola vez.
            </p>
            <input
              style={styles.input}
              placeholder="Busca tu nombre o correo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div style={styles.list}>
              {filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u.id)}
                  style={{
                    ...styles.userRow,
                    ...(selected === u.id ? styles.userRowSelected : {}),
                  }}
                >
                  <span style={styles.userName}>{u.full_name ?? u.email}</span>
                  <span style={styles.userEmail}>{u.email}</span>
                </button>
              ))}
              {filtered.length === 0 && <p style={styles.empty}>Sin coincidencias</p>}
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button
              onClick={confirm}
              disabled={!selected || submitting}
              style={{
                ...styles.confirm,
                ...(!selected || submitting ? styles.confirmDisabled : {}),
              }}
            >
              {submitting ? 'Activando…' : 'Soy yo, activar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f172a',
    padding: 16,
  },
  card: { width: '100%', maxWidth: 360, color: '#e2e8f0' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  logoText: { fontSize: 18, fontWeight: 600 },
  subtitle: { fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 12 },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 10,
    boxSizing: 'border-box',
  },
  list: { maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 },
  userRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#e2e8f0',
    cursor: 'pointer',
    textAlign: 'left',
  },
  userRowSelected: { border: '1px solid #3b82f6', background: '#1d4ed833' },
  userName: { fontSize: 14, fontWeight: 500 },
  userEmail: { fontSize: 12, color: '#94a3b8' },
  empty: { fontSize: 13, color: '#64748b', textAlign: 'center', padding: 12 },
  error: { fontSize: 12, color: '#f87171', marginTop: 8 },
  confirm: {
    marginTop: 12,
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmDisabled: { opacity: 0.5, cursor: 'not-allowed' },
}
