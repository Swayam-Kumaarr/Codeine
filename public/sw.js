const CACHE = 'codeine-v1'
const OFFLINE = ['/dashboard', '/login']

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE).catch(() => {})))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) return
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() ?? {}
  const title = data.title ?? 'Codeine'
  const body = data.body ?? 'Time to level up.'
  const icon = '/icons/icon-192.png'
  const badge = '/icons/icon-192.png'
  const tag = data.tag ?? 'default'
  const url = data.url ?? '/dashboard'

  e.waitUntil(
    self.registration.showNotification(title, { body, icon, badge, tag, data: { url } })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/dashboard'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const match = wins.find(w => w.url.includes(url))
      if (match) return match.focus()
      return clients.openWindow(url)
    })
  )
})
