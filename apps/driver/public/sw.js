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

  event.waitUntil(self.registration.showNotification(title, options));
});

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
      }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
