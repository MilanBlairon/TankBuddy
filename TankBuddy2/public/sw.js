// App-shell cache: opens instantly and works offline (data itself is cached by Firestore's IndexedDB cache).
const C = 'tb-0182420b';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/views.js', 'js/data.js', 'js/charts.js', 'js/ocr.js', 'js/util.js', 'js/updater.js', 'js/boot-error.js', 'js/version.js', 'js/config.js', 'manifest.webmanifest', 'icons/icon-192.png'];
const CDN = ['cdn.jsdelivr.net', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(C).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x)))).then(() => clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || (u.origin !== location.origin && !CDN.includes(u.host)) || u.pathname.endsWith('demo.json')) return;
  const cdn = u.origin !== location.origin;
  e.respondWith(caches.open(C).then(async (c) => {
    const hit = await c.match(e.request);
    if (hit && cdn) return hit; // CDN assets are versioned/pinned: cache-first
    // app files: network-first (always a matching set of files after a deploy), cache only as offline fallback
    try {
      const r = await fetch(e.request, { cache: 'no-cache' });
      if (r.ok || r.type === 'opaque') c.put(e.request, r.clone());
      return r;
    } catch (err) { if (hit) return hit; throw err; }
  }));
});
