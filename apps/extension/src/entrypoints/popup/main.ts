function pinta(e: { dominio: string | null; agente: boolean; ultimo: string | null }) {
  const $ = (id: string) => document.getElementById(id)!
  $('agente').textContent = e.agente ? 'conectado' : 'no detectado'
  $('agente').className = e.agente ? 'ok' : 'mal'
  $('dominio').textContent = e.dominio ?? '—'
  $('ultimo').textContent = e.ultimo
    ? new Date(e.ultimo).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : '—'
}
function refrescar() {
  chrome.runtime.sendMessage({ type: 'estado' }, (r) => r && pinta(r))
}
refrescar()
setInterval(refrescar, 2000)
