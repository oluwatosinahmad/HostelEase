/**
 * HOSTEL EASE — SAFE PROGRESSIVE WEB APP SERVICE WORKER
 * 
 * Rules:
 * 1. ZERO caching of /api/* endpoints (all dynamic data, auth, bookings, inspections stay real-time).
 * 2. ZERO caching of /uploads/* (preserves native HTTP 206 video streaming and fresh uploads).
 * 3. ZERO caching of Vite development internals (@vite, @react-refresh, @fs, hot-update).
 * 4. Network-First for HTML navigation so all development edits and updates appear immediately.
 * 5. Offline fallback only for essential static app shell.
 */

const CACHE_NAME = 'hostel-ease-pwa-v7';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // 1. Only handle GET requests from the same origin
  if (request.method !== 'GET') return;
  if (!url.startsWith(self.location.origin)) return;

  // 2. NEVER intercept or cache API endpoints
  if (url.includes('/api/')) return;

  // 3. NEVER intercept or cache uploaded media or video walkthroughs (ensures HTTP 206 Range streaming works natively)
  if (
    url.includes('/uploads/') ||
    url.endsWith('.mp4') ||
    url.endsWith('.webm') ||
    url.endsWith('.mov') ||
    request.headers.get('range')
  ) {
    return;
  }

  // 4. NEVER intercept Vite development / HMR server scripts
  if (
    url.includes('/@vite/') ||
    url.includes('/@react-refresh') ||
    url.includes('/@fs/') ||
    url.includes('/@id/') ||
    url.includes('__vite_ping') ||
    url.includes('hot-update') ||
    url.includes('node_modules/.vite')
  ) {
    return;
  }

  // 5. Network-First for HTML navigation so changes are instantly visible on refresh
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // 6. Network-First for built static assets (JS, CSS, fonts) with offline cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        // Cache built production assets
        if (
          url.includes('/assets/') ||
          url.endsWith('.woff2') ||
          url.endsWith('.png') ||
          url.endsWith('.svg')
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
