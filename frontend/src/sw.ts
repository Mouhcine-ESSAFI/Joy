/// <reference lib="webworker" />

// These two declarations tell TypeScript this is a service worker scope.
// They must come before any imports so the webworker types take precedence
// over the dom types in tsconfig.json.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string;
    revision?: string | null;
  }>;
};

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

// Take control immediately so push events are handled by this version.
self.skipWaiting();
clientsClaim();

// Workbox injects the precache manifest here at build time.
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ─── Runtime caching ─────────────────────────────────────────────────────────

// API calls — network-first with a short timeout so the UI stays responsive.
// Matches both same-origin /api/* calls (via Next.js rewrite proxy) and direct backend calls.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    (url.pathname.startsWith('/api/') ||
      (url.pathname !== '/' &&
        !url.pathname.startsWith('/_next') &&
        !url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/))),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
  }),
  'GET',
);

// Same-origin static assets — serve from cache while revalidating in background.
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image' ||
      request.destination === 'font'),
  new StaleWhileRevalidate({
    cacheName: 'static-assets-cache',
  }),
);

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) {
    console.warn('[SW] Push received without data — ignoring');
    return;
  }

  let data: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    data?: { orderId?: string; orderNumber?: string; url?: string };
  } = {};

  try {
    data = event.data.json();
  } catch {
    console.error('[SW] Failed to parse push payload as JSON');
    return;
  }

  const title = data.title || 'New Notification';
  const options: NotificationOptions & { vibrate?: number[] } = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    data: data.data ?? {},
    // Use orderId as tag so duplicate pushes collapse into one notification.
    tag: data.data?.orderId ?? 'notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(async () => {
      // Notify any open windows so they can refresh their order list.
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

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const targetPath: string = (event.notification.data as any)?.url ?? '/orders';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If there is already a window on our origin, focus it and navigate.
        for (const client of clientList) {
          if ('focus' in client) {
            return (client as WindowClient)
              .focus()
              .then((focused) => focused.navigate(targetUrl));
          }
        }
        // No existing window — open a new one.
        return self.clients.openWindow(targetUrl);
      }),
  );
});

// ─── Skip-waiting message ─────────────────────────────────────────────────────

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Custom service worker loaded — push handlers active');
