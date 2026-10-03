// DM WIN Predictor — service worker.
// Cache the shell for offline use; always hit the network for predictions.
const CACHE = 'dm-win-predictor-v1';
const ASSETS = [
  '/black-og-hack/',
  '/black-og-hack/index.html',
  '/black-og-hack/manifest.webmanifest',
  '/black-og-hack/icons/icon-192.png',
  '/black-og-hack/icons/icon-512.png',
  '/black-og-hack/sw.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Predictions must always be fresh.
  if (url.pathname === '/api/predictions') {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({
      code: 1, result: false, msg: 'offline', data: null
    }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  // Shell assets: cache first.
  if (url.pathname.startsWith('/black-og-hack/')) {
    e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return resp;
    }).catch(() => cached)));
    return;
  }
  e.respondWith(fetch(e.request));
});
