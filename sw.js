// Lets Nautic Online install and open even with a weak connection.
const VERSION = '7.6.3';
const CACHE = 'funz-online-' + VERSION;
const FILES = ['./', 'index.html', 'style.css', 
  'js/icons.js', 'js/device.js', 'js/gl.js', 'js/lib/three.min.js', 'js/lib/three-post.js', 'js/textures.js', 'js/gl3.js', 'js/isles.js', 'js/terrain.js', 'js/worlds.js', 'js/lands.js', 'js/structures.js', 'js/buildings.js', 'js/sky.js', 'js/realms.js', 'js/parts.js', 'js/custom.js', 'js/models.js', 'js/ships.js', 'js/space.js', 'js/fx.js', 'js/sound.js', 'js/chase.js', 'js/games.js', 'js/games2.js', 'js/regions.js', 'js/game.js', 'js/net.js', 'js/modkit.js', 'js/servers.js', 'js/bigmap.js', 'js/updates.js', 'js/app.js',
  'modmaker/', 'modmaker/index.html', 'modmaker/editor.js', 'modmaker/editor.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png',
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(FILES.map(f => c.add(new Request(f, { cache: 'reload' }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('funz-online-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Always ask the server for the newest files first (so updates show up right away),
// and fall back to the saved copy when there's no connection.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url), own = url.origin === location.origin;
  if (!own && !url.href.includes('unpkg.com/peerjs')) return;
  if (own && url.pathname.endsWith('version.json')) return; // the update check always goes straight to the network
  const ask = own ? fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request);
  e.respondWith(ask.then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
