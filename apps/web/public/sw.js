const CACHE_NAME = 'bcwork-v1'
const STATIC_ASSETS = ['/', '/manifest.json', '/brand/icon-192.png', '/brand/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  )
  self.clients.claim()
})

// Network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET, cross-origin, and tRPC requests
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/trpc')
  ) {
    return
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)))
    return
  }

  // Network-first for everything else
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
})

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'BCWork', {
      body: data.message ?? '',
      icon: '/brand/icon-192.png',
      badge: '/brand/icon-192.png',
      data: { url: data.link ?? '/dashboard' },
      tag: data.tag ?? 'bcwork-notification',
      renotify: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    }),
  )
})
