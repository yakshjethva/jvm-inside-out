/* global PRECACHE, VERSION */
/**
 * JVM Atlas service worker. After the first visit the site keeps working
 * offline, including reloads: the build output is precached, pages are
 * fetched network-first (so a new deployment is picked up at once) and fall
 * back to the cached application shell when the network is unavailable.
 *
 * The build prepends PRECACHE (scope-relative URLs) and VERSION; see
 * vite.config.ts. The app registers it in production only.
 */
const CACHE = `jvm-atlas-${VERSION}`;
const scope = self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((path) => new URL(path, scope).href)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Also clears caches from before the rename to JVM Atlas.
            .filter(
              (key) =>
                (key.startsWith('jvm-atlas-') || key.startsWith('inside-java-')) && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  event.respondWith(request.mode === 'navigate' ? fromNetwork(request) : fromCache(request));
});

/** Pages: the network first, then the cached application shell. */
async function fromNetwork(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const shell = await caches.match(new URL('./', scope).href);
    if (shell) return shell;
    throw error;
  }
}

/** Build assets are content-hashed and never change: the cache first. */
async function fromCache(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}
