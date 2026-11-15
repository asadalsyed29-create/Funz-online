// Lets Funz Online install and open even with a weak connection.
const CACHE = 'funz-online-v3-1';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/icons.js', 'js/device.js', 'js/gl.js', 'js/terrain.js', 'js/structures.js', 'js/parts.js', 'js/models.js', 'js/game.js', 'js/net.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png',
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(FILES.map(f => c.add(f)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Try the network first so updates show up, fall back to the saved copy.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin && !url.href.includes('unpkg.com/peerjs')) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
