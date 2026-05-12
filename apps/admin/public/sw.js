const CACHE = 'joy-admin-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Next.js static chunks → cache-first (content-hashed, safe to cache)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // API calls → network-first, fall back to cache
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
});

self.addEventListener('push', function (event) {
  if (!event.data) return;

  var data = {};
  try {
    data = event.data.json();
  } catch (e) {
    return;
  }

  var title = data.title || 'New Notification';
  var options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/web-app-manifest-192x192.png',
    badge: data.badge || '/web-app-manifest-192x192.png',
    data: data.data || {},
    tag: (data.data && data.data.orderId) || 'notification',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: data.actions || [
      { action: 'view', title: 'View Order' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(function () {
      return self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    }).then(function (clients) {
      clients.forEach(function (client) {
        client.postMessage({ type: 'PUSH_NOTIFICATION', notification: data });
      });
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  if (event.action === 'dismiss') return;

  var targetPath = (event.notification.data && event.notification.data.url) || '/orders';
  var targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if ('focus' in clientList[i]) {
          return clientList[i].focus().then(function (c) { return c.navigate(targetUrl); });
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
