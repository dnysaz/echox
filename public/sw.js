const VERSION = 'echox-v1';
const SHELL = [
  '/',
  '/terms',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const put = (request, response) => {
  if (!response || !response.ok) return;
  const copy = response.clone();
  caches.open(VERSION).then((cache) => cache.put(request, copy));
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Audio streams and music APIs stay on the network: never cache them.
  if (url.origin !== self.location.origin) return;

  // App shell: network first, cached copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          put(request, response);
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')))
    );
    return;
  }

  // Hashed build assets never change: cache first.
  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            put(request, response);
            return response;
          })
      )
    );
    return;
  }

  // Everything else on our origin: serve fast, refresh in the background.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((response) => {
          put(request, response);
          return response;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
