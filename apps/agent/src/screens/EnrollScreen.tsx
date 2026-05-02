import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface Props {
  onEnrolled: () => void
}

const DEFAULT_SERVER = import.meta.env.DEV
  ? 'http://localhost:3001'
  : 'https://bcwork.bc-security.com'

export function EnrollScreen({ onEnrolled }: Props) {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)
  const [code, setCode] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await invoke('enroll', {
        code: code.toUpperCase().trim(),
        deviceName: deviceName.trim(),
        serverUrl: serverUrl.trim(),
      })
      onEnrolled()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
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

        <p style={styles.subtitle}>
          Ingresa el código de enrolamiento generado por tu administrador para activar el monitoreo
          en este dispositivo.
        </p>

        <form onSubmit={handleEnroll} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Servidor</label>
            <input
              style={styles.input}
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://app.bcwork.co"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Nombre del dispositivo</label>
            <input
              style={styles.input}
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Mi PC de trabajo"
              required
              maxLength={100}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Código de enrolamiento</label>
            <input
              style={{ ...styles.input, ...styles.codeInput }}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="XXXXXXXX"
              maxLength={8}
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Enrolando...' : 'Activar monitoreo'}
          </button>
        </form>

        <p style={styles.note}>
          El agente captura aplicaciones activas e inactividad. No accede a contraseñas ni datos
          personales. Ley 2191/2022 garantiza tu derecho a la desconexión digital.
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    padding: '24px',
  },
  card: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '380px',
    border: '1px solid #334155',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#94a3b8',
  },
  input: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
  },
  codeInput: {
    letterSpacing: '4px',
    fontFamily: 'monospace',
    fontSize: '18px',
    textAlign: 'center',
  },
  error: {
    fontSize: '13px',
    color: '#f87171',
    background: '#450a0a',
    padding: '10px 12px',
    borderRadius: '8px',
  },
  button: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
  note: {
    fontSize: '11px',
    color: '#475569',
    lineHeight: 1.5,
    marginTop: '24px',
    borderTop: '1px solid #1e293b',
    paddingTop: '16px',
  },
}
