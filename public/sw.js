/*
 * Service worker for the mosque app.
 *
 * DELIBERATELY CONSERVATIVE ABOUT WHAT IT CACHES.
 *
 * Every page here is behind a login and shows one specific user's data - a teacher's
 * own students, a parent's own children. A shared phone or tablet in the mosque may be
 * used by several people, so caching page HTML could show one user another user's
 * data after they log out. This worker therefore NEVER caches:
 *
 *   - navigation responses (the pages themselves)
 *   - anything to the Supabase API (data and auth)
 *   - Server Action POSTs
 *
 * It caches only genuinely static, user-independent files: the hashed build output,
 * icons and images. Those are safe because they are identical for everyone.
 *
 * The benefit is a real install, instant asset loads, and a proper offline message
 * instead of the browser's dinosaur.
 */

const VERSION = 'v1';
const STATIC_CACHE = `mosque-static-${VERSION}`;
const OFFLINE_URL = '/offline.html';

// Precache only the offline fallback; everything else fills in as it is requested.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png']))
      .then(() => self.skipWaiting()),
  );
});

// Drop caches from older versions so a deploy cannot serve stale assets forever.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Files that are identical for every user and therefore safe to cache. */
function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never interfere with anything that changes state.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Supabase (data + auth) must always go to the network, and must never be stored.
  if (url.hostname.endsWith('.supabase.co')) return;

  // Navigations: network first, and fall back to the offline page - NOT to a cached
  // copy of the page, which could belong to a different user.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
    return;
  }

  // Static assets: cache first. Build output is content-hashed, so it never goes stale.
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }

  // Everything else falls through to the network untouched.
});
