/**
 * Dominio registrable a partir de una URL: `https://www.youtube.com/watch?v=x`
 * → `youtube.com`. Se descarta todo lo demás (ruta, parámetros, subdominio
 * `www`): la extensión nunca reporta la URL completa.
 */
export function extractDomain(url: string): string | null {
  let host: string
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    host = u.hostname.toLowerCase()
  } catch {
    return null
  }
  if (!host || host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':')) return null
  return host.startsWith('www.') ? host.slice(4) : host
}
