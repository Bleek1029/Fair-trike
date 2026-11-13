// Auto-generated at build time — see build script
const CACHE = 'fairtrike-v<%= version %>-<%= Date.now() %>';
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/fairtrike-logo.png',
  '/seal.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // tiles, fonts, geocoding go to network
  // Never cache API calls or uploads — always live data.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  if (request.mode === 'navigate') {
    // Network-only for HTML navigations — always fresh, never cached.
    // This prevents stale index.html from being served after deploy.
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts).
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});

// Listen for version check messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'VERSION_CHECK') {
    // Return just the version number (without timestamp) for comparison with meta tag
    const version = CACHE.match(/fairtrike-v([^-]+)/)?.[1] || CACHE;
    event.ports[0]?.postMessage({ version });
  }
});

// Notify clients when a new SW is ready (skipWaiting was called)
self.addEventListener('controllerchange', () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
  });
});