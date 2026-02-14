/* ============================================
   CHUM VÉ SỐ — Service Worker (Offline Cache)
   ============================================ */
const CACHE_NAME = 'chum-veso-v3';
const STATIC_ASSETS = [
    './',
    './index.html',
    './assets/style.css',
    './assets/app.js',
    './manifest.json'
];

/* Install: cache static assets */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

/* Activate: clean old caches */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

/* Fetch: cache-first for static, network-first for API */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    /* Network-first for CORS proxy / API calls */
    if (url.hostname !== self.location.hostname) {
        event.respondWith(
            fetch(event.request)
                .then(resp => {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return resp;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    /* Cache-first for local static assets */
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});
