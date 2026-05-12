const CACHE = 'joy-driver-v2';

const PRECACHE = [
  '/',
  '/calendar',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ─── Install: pre-cache shell ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(PRECACHE.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

// ─── Activate: purge old caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: caching strategy ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Next.js static chunks → cache-first (they're content-hashed)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  // API calls (/api/*) → network-first, fall back to cache so offline works
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Pages → stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    return;
  }

  const title = data.title || 'New Tour Assignment';
  const options = {
    body: data.body || 'You have a new tour assignment.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: data.data ?? {},
    tag: data.data?.orderId ?? 'notification',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: data.actions ?? [
      { action: 'view', title: 'View Tour' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() =>
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    ).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'PUSH_NOTIFICATION', notification: data });
      });
    })
  );
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetPath = event.notification.data?.url ?? '/calendar';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus().then((focused) => focused.navigate(targetUrl));
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
