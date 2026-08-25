// Pantalla de transparencia (aviso de privacidad). El agente monitorea de forma
// declarada, conforme a la Ley 1581/2012 (habeas data). No hay controles de
// apagado para el empleado.
export function ActiveScreen() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>
          <span style={styles.dot} /> Monitoreo activo
        </div>
        <p style={styles.text}>
          Este equipo tiene BCWork Agent activo. Se registra el nombre de las aplicaciones activas y
          el tiempo de uso durante la jornada.
        </p>
        <p style={styles.textMuted}>
          No se accede al contenido de documentos, contraseñas ni capturas de pantalla. Tus datos se
          protegen bajo la Ley 1581/2012 (habeas data).
        </p>
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
    padding: 20,
  },
  card: { maxWidth: 340, color: '#e2e8f0' },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 999,
    background: '#16a34a22',
    color: '#4ade80',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 14,
  },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#22c55e' },
  text: { fontSize: 13, lineHeight: 1.6, marginBottom: 10 },
  textMuted: { fontSize: 12, lineHeight: 1.6, color: '#94a3b8' },
}
