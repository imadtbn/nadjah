const CACHE_VERSION = 'nadjah-v5';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  './',
  './index.html',
  './pages/search.html',
  './pages/levels.html',
  './pages/subjects.html',
  './pages/branch.html',
  './pages/my.html',
  './offline.html',
  './site.webmanifest',
  './assets/css/style-main.css',
  './assets/css/style-global.css',
  './assets/css/ux.css',
  './assets/js/core.js',
  './assets/js/main.js',
  './assets/js/search-page.js',
  './assets/js/user-state.js',
  './assets/js/my-page.js',
  './assets/data/site-stats.json',
  './assets/data/levels.json',
  './assets/data/subjects.json',
  './assets/data/branches.json',
  './assets/data/resources.json',
  './assets/images/icon22.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('nadjah-') && ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function sameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isHtml(request) {
  return request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !sameOrigin(request)) return;

  if (isHtml(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('./offline.html');
        })
    );
    return;
  }

  const url = new URL(request.url);
  const isFreshAsset = /\.(?:css|js|json)$/i.test(url.pathname);
  const isCacheFirstAsset = /\.(?:png|jpg|jpeg|webp|svg|woff2?)$/i.test(url.pathname);

  if (isFreshAsset) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) || Response.error();
        })
    );
    return;
  }

  if (isCacheFirstAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
