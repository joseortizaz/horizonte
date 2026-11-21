// Service worker de Proyéctate: guarda los archivos del juego para que
// abra rápido y funcione aunque la conexión falle.
// Cambia la versión cuando quieras forzar que se renueve la caché.
const CACHE = 'horizonte-v1'
const INICIO = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(INICIO)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo archivos propios del juego; Supabase y otros servicios van directo a internet
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Páginas: primero internet (para tener la versión más nueva); sin conexión, la guardada
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone()
          caches.open(CACHE).then((cache) => cache.put('/index.html', copia))
          return respuesta
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Archivos (código, imágenes): se usa la copia guardada y se actualiza en segundo plano
  event.respondWith(
    caches.match(request).then((guardada) => {
      const deInternet = fetch(request)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copia))
          }
          return respuesta
        })
        .catch(() => guardada)
      return guardada ?? deInternet
    })
  )
})
