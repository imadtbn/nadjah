const CACHE_VERSION = 'nadjah-v8';
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
  './assets/css/style-main2.css',
  './assets/css/style-global.css',
  './assets/css/legal.css',
  './assets/css/ads.css',
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

async function matchCached(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  return (await runtime.match(request)) || (await caches.match(request));
}

async function matchUnversionedAsset(url) {
  const plainRequest = new Request(`${url.origin}${url.pathname}`);
  const runtime = await caches.open(RUNTIME_CACHE);
  return (await runtime.match(plainRequest)) || (await caches.match(plainRequest));
}

function refreshAsset(request) {
  return fetch(request, { cache: 'no-store' })
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !sameOrigin(request)) return;

  if (isHtml(request)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(RUNTIME_CACHE);
              await cache.put(request, response.clone());
            } catch (error) {
              // A cache quota or storage error must not block a successful network response.
            }
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
  const isJson = /\.json$/i.test(url.pathname);
  const isCssOrJs = /\.(?:css|js)$/i.test(url.pathname);
  const isVersionedAsset = isCssOrJs && url.searchParams.has('v');
  const isCacheFirstAsset = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf)$/i.test(url.pathname);

  // JSON and content-versioned CSS/JS use stale-while-revalidate:
  // render from cache immediately, while refreshing the same URL in the background.
  if (isJson || isVersionedAsset) {
    const update = refreshAsset(request);
    event.waitUntil(update.then(() => undefined));
    event.respondWith((async () => {
      const cached = await matchCached(request);
      if (cached) return cached;

      const response = await update;
      if (response) return response;

      if (isVersionedAsset) {
        const fallback = await matchUnversionedAsset(url);
        if (fallback) return fallback;
      }

      return Response.error();
    })());
    return;
  }

  // Unversioned script/style requests remain network-first for compatibility.
  if (isCssOrJs) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(RUNTIME_CACHE);
              await cache.put(request, response.clone());
            } catch (error) {
              // A cache quota or storage error must not block a successful network response.
            }
          }
          return response;
        })
        .catch(async () => {
          return (await matchCached(request)) || Response.error();
        })
    );
    return;
  }

  if (isCacheFirstAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(RUNTIME_CACHE);
              await cache.put(request, response.clone());
            } catch (error) {
              // Keep the fetched asset usable even when browser storage is unavailable.
            }
          }
          return response;
        })
      })
    );
  }
});
