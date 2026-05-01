import { useState } from 'react'

interface Props {
  onSaved: () => void
}

export function SetupScreen({ onSaved }: Props) {
  const [serverUrl, setServerUrl] = useState('https://app.bcwork.co')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      // Verificar credenciales enviando un batch vacío
      const resp = await fetch(`${serverUrl.replace(/\/$/, '')}/api/ingest/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          batch_id: crypto.randomUUID(),
          events: [],
          session_state: {
            started_at: new Date().toISOString(),
            is_active: false,
            active_seconds: 0,
            idle_seconds: 0,
          },
        }),
      })

      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: string }
        setError(body.error === 'invalid_api_key' ? 'API key inválida' : `Error: ${resp.status}`)
        return
      }

      await chrome.runtime.sendMessage({
        type: 'set_credentials',
        credentials: { serverUrl: serverUrl.trim(), apiKey: apiKey.trim(), deviceId: '' },
      })
      onSaved()
    } catch {
      setError('No se pudo conectar al servidor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <Logo />
        <span style={s.title}>BCWork Monitor</span>
      </div>
      <p style={s.subtitle}>Configura la extensión con las credenciales de tu cuenta.</p>

      <form onSubmit={handleSave} style={s.form}>
        <Field label="Servidor">
          <input
            style={s.input}
            type="url"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            required
          />
        </Field>
        <Field label="API Key">
          <input
            style={s.input}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Generada desde la app del agente"
            required
          />
        </Field>

        {error && <p style={s.error}>{error}</p>}

        <button type="submit" disabled={saving} style={s.btn}>
          {saving ? 'Verificando...' : 'Guardar y activar'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
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
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 },
  header: { display: 'flex', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: 700, color: '#f1f5f9' },
  subtitle: { fontSize: 12, color: '#64748b', lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '8px 10px',
    color: '#f1f5f9',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  },
  error: {
    fontSize: 12,
    color: '#f87171',
    background: '#450a0a',
    padding: '8px 10px',
    borderRadius: 6,
  },
  btn: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 7,
    padding: '10px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
