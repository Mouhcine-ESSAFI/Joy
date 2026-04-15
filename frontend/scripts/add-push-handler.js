#!/usr/bin/env node
/**
 * Post-build script: appends push notification event handlers to the
 * Workbox-generated public/sw.js, which does not support custom swSrc
 * with ES module imports in @ducanh2912/next-pwa v10.
 */
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/sw.js');

if (!fs.existsSync(swPath)) {
  console.error('ERROR: public/sw.js not found. Run npm run build first.');
  process.exit(1);
}

const sw = fs.readFileSync(swPath, 'utf8');

if (sw.includes('PUSH_HANDLER_INJECTED')) {
  console.log('[add-push-handler] Push handlers already present — skipping.');
  process.exit(0);
}

const pushHandler = `

// PUSH_HANDLER_INJECTED — appended by scripts/add-push-handler.js

self.addEventListener('push', function(event) {
  if (!event.data) {
    console.warn('[SW] Push received without data');
    return;
  }

  var data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[SW] Failed to parse push payload');
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
      { action: 'dismiss', title: 'Dismiss' }
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(function() {
      return self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'PUSH_NOTIFICATION', notification: data });
      });
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // "Dismiss" action — just close, no navigation
  if (event.action === 'dismiss') return;

  // "View Order" action or clicking the notification body — navigate to order
  var targetPath = (event.notification.data && event.notification.data.url) || '/orders';
  var targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If app is already open, focus it and navigate
      for (var i = 0; i < clientList.length; i++) {
        if ('focus' in clientList[i]) {
          return clientList[i].focus().then(function(c) { return c.navigate(targetUrl); });
        }
      }
      // App not open — open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

console.log('[SW] Push handlers active');
`;

fs.writeFileSync(swPath, sw + pushHandler);
console.log('[add-push-handler] Push handlers appended to public/sw.js ✓');
