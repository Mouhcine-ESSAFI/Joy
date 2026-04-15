/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// API calls — network-first
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    (url.pathname.startsWith('/api/') ||
      (url.pathname !== '/' &&
        !url.pathname.startsWith('/_next') &&
        !url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/))),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 10 }),
  'GET',
);

// Static assets
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image' ||
      request.destination === 'font'),
  new StaleWhileRevalidate({ cacheName: 'static-assets-cache' }),
);

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('[SW] Push received without data — ignoring');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch {
    console.error('[SW] Failed to parse push payload as JSON');
    return;
  }

  const title = data.title || 'New Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/web-app-manifest-192x192.png',
    badge: data.badge || '/web-app-manifest-192x192.png',
    data: data.data ?? {},
    tag: data.data?.orderId ?? 'notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(async () => {
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      });
      for (const client of clients) {
        client.postMessage({ type: 'PUSH_NOTIFICATION', notification: data });
      }
    }),
  );
});

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetPath = event.notification.data?.url ?? '/orders';
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
      }),
  );
});

// ─── Skip-waiting message ─────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Custom service worker loaded — push handlers active');
