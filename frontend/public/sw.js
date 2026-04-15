if(!self.define){let e,s={};const a=(a,n)=>(a=new URL(a+".js",n).href,s[a]||new Promise(s=>{if("document"in self){const e=document.createElement("script");e.src=a,e.onload=s,document.head.appendChild(e)}else e=a,importScripts(a),s()}).then(()=>{let e=s[a];if(!e)throw new Error(`Module ${a} didn’t register its module`);return e}));self.define=(n,c)=>{const i=e||("document"in self?document.currentScript.src:"")||location.href;if(s[i])return;let t={};const r=e=>a(e,i),d={module:{uri:i},exports:t,require:r};s[i]=Promise.all(n.map(e=>d[e]||r(e))).then(e=>(c(...e),t))}}define(["./workbox-f1770938"],function(e){"use strict";importScripts(),self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"/_next/static/chunks/129-2bb3f2665bd5a49c.js",revision:"2bb3f2665bd5a49c"},{url:"/_next/static/chunks/144-63a6bc1c20fddc6f.js",revision:"63a6bc1c20fddc6f"},{url:"/_next/static/chunks/169-5395a44033fa8d8d.js",revision:"5395a44033fa8d8d"},{url:"/_next/static/chunks/26-d72220b901ab4711.js",revision:"d72220b901ab4711"},{url:"/_next/static/chunks/352-d1b8300e288c7de6.js",revision:"d1b8300e288c7de6"},{url:"/_next/static/chunks/476-34bd724fdb095e1b.js",revision:"34bd724fdb095e1b"},{url:"/_next/static/chunks/4bd1b696-c023c6e3521b1417.js",revision:"c023c6e3521b1417"},{url:"/_next/static/chunks/559-4c42713f30a448e8.js",revision:"4c42713f30a448e8"},{url:"/_next/static/chunks/57-703305652976a915.js",revision:"703305652976a915"},{url:"/_next/static/chunks/623-3867ef0fb577eb25.js",revision:"3867ef0fb577eb25"},{url:"/_next/static/chunks/646-8ccc142a557b772b.js",revision:"8ccc142a557b772b"},{url:"/_next/static/chunks/696-011459a0bbc5b550.js",revision:"011459a0bbc5b550"},{url:"/_next/static/chunks/77-d27a8d83b46f64ca.js",revision:"d27a8d83b46f64ca"},{url:"/_next/static/chunks/816-aa13e1c837689729.js",revision:"aa13e1c837689729"},{url:"/_next/static/chunks/913-77f325f2f7b22a3c.js",revision:"77f325f2f7b22a3c"},{url:"/_next/static/chunks/956-5e9180e8334ccd19.js",revision:"5e9180e8334ccd19"},{url:"/_next/static/chunks/97-d9864361b6789ce3.js",revision:"d9864361b6789ce3"},{url:"/_next/static/chunks/984-de8774b2ccddfdfc.js",revision:"de8774b2ccddfdfc"},{url:"/_next/static/chunks/app/_not-found/page-de9a7b193ce617a9.js",revision:"de9a7b193ce617a9"},{url:"/_next/static/chunks/app/admin/integrations/page-ba9c344bbf09438e.js",revision:"ba9c344bbf09438e"},{url:"/_next/static/chunks/app/admin/profile/page-6c93af26296e024a.js",revision:"6c93af26296e024a"},{url:"/_next/static/chunks/app/admin/settings/room-rules/page-1adca56f5deab3b1.js",revision:"1adca56f5deab3b1"},{url:"/_next/static/chunks/app/admin/settings/transport/page-63dcf26c95583828.js",revision:"63dcf26c95583828"},{url:"/_next/static/chunks/app/admin/tour-mapping/page-7f33459c09cff1ed.js",revision:"7f33459c09cff1ed"},{url:"/_next/static/chunks/app/admin/users/edit/%5BuserId%5D/page-f7826568e8c83ab2.js",revision:"f7826568e8c83ab2"},{url:"/_next/static/chunks/app/admin/users/new/page-d1fd8a7fe03e3920.js",revision:"d1fd8a7fe03e3920"},{url:"/_next/static/chunks/app/admin/users/page-9a21881906af3be5.js",revision:"9a21881906af3be5"},{url:"/_next/static/chunks/app/calendar/page-1ae2f2982f7710db.js",revision:"1ae2f2982f7710db"},{url:"/_next/static/chunks/app/customers/page-7ea43262618572e5.js",revision:"7ea43262618572e5"},{url:"/_next/static/chunks/app/dashboard/page-2ee29f2384471c80.js",revision:"2ee29f2384471c80"},{url:"/_next/static/chunks/app/layout-ae56d561f25df0a2.js",revision:"ae56d561f25df0a2"},{url:"/_next/static/chunks/app/login/page-c395d31efd348062.js",revision:"c395d31efd348062"},{url:"/_next/static/chunks/app/orders/%5BorderId%5D/page-af07d8ba5cf9807c.js",revision:"af07d8ba5cf9807c"},{url:"/_next/static/chunks/app/orders/new/page-458bfe359a781f28.js",revision:"458bfe359a781f28"},{url:"/_next/static/chunks/app/orders/page-e995c49ce44f0915.js",revision:"e995c49ce44f0915"},{url:"/_next/static/chunks/app/page-a637f7f5c2128c39.js",revision:"a637f7f5c2128c39"},{url:"/_next/static/chunks/framework-a6e0b7e30f98059a.js",revision:"a6e0b7e30f98059a"},{url:"/_next/static/chunks/main-0715a64d467eced2.js",revision:"0715a64d467eced2"},{url:"/_next/static/chunks/main-app-e28daa361dbb2705.js",revision:"e28daa361dbb2705"},{url:"/_next/static/chunks/pages/_app-7d307437aca18ad4.js",revision:"7d307437aca18ad4"},{url:"/_next/static/chunks/pages/_error-cb2a52f75f2162e2.js",revision:"cb2a52f75f2162e2"},{url:"/_next/static/chunks/polyfills-42372ed130431b0a.js",revision:"846118c33b2c0e922d7b3a7676f81f6f"},{url:"/_next/static/chunks/webpack-60785faceb2046e0.js",revision:"60785faceb2046e0"},{url:"/_next/static/css/bfdd3440f0c5d42e.css",revision:"bfdd3440f0c5d42e"},{url:"/_next/static/ryMI3naZUR0cWY0SXwDW5/_buildManifest.js",revision:"e5d346e8b130dfe0c92f36a641c63b0e"},{url:"/_next/static/ryMI3naZUR0cWY0SXwDW5/_ssgManifest.js",revision:"b6652df95db52feb4daf4eca35380933"},{url:"/apple-touch-icon.png",revision:"403b371c11665856dadfe3d6b0b4fe30"},{url:"/favicon copy.ico",revision:"1e66f15820ef640664daa8c54b4124dd"},{url:"/favicon-96x96.png",revision:"403b371c11665856dadfe3d6b0b4fe30"},{url:"/favicon.ico",revision:"1e66f15820ef640664daa8c54b4124dd"},{url:"/favicon.svg",revision:"521c13c24ee1a9f48235235b8f2cdc47"},{url:"/icon-192x192.png",revision:"403b371c11665856dadfe3d6b0b4fe30"},{url:"/icon-512x512.png",revision:"403b371c11665856dadfe3d6b0b4fe30"},{url:"/manifest.json",revision:"ec5f71d419343f53bafbd140d47d3c20"},{url:"/site.webmanifest",revision:"9090e674d41e265d5f03c180fe5f6721"},{url:"/web-app-manifest-192x192.png",revision:"236ae825659d4d18275e166de486fdfb"},{url:"/web-app-manifest-512x512.png",revision:"61c957fd9224e023046393d248c67ca7"}],{ignoreURLParametersMatching:[/^utm_/,/^fbclid$/]}),e.cleanupOutdatedCaches(),e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",plugins:[{cacheWillUpdate:function(e){var s=e.response;return _async_to_generator(function(){return _ts_generator(this,function(e){return[2,s&&"opaqueredirect"===s.type?new Response(s.body,{status:200,statusText:"OK",headers:s.headers}):s]})})()}}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts-webfonts",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:31536e3})]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,new e.StaleWhileRevalidate({cacheName:"google-fonts-stylesheets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,new e.StaleWhileRevalidate({cacheName:"static-font-assets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,new e.StaleWhileRevalidate({cacheName:"static-image-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:2592e3})]}),"GET"),e.registerRoute(/\/_next\/static.+\.js$/i,new e.CacheFirst({cacheName:"next-static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/image\?url=.+$/i,new e.StaleWhileRevalidate({cacheName:"next-image",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp3|wav|ogg)$/i,new e.CacheFirst({cacheName:"static-audio-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp4|webm)$/i,new e.CacheFirst({cacheName:"static-video-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:js)$/i,new e.StaleWhileRevalidate({cacheName:"static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:48,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:css|less)$/i,new e.StaleWhileRevalidate({cacheName:"static-style-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/data\/.+\/.+\.json$/i,new e.StaleWhileRevalidate({cacheName:"next-data",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:json|xml|csv)$/i,new e.NetworkFirst({cacheName:"static-data-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(function(e){var s=e.sameOrigin,a=e.url.pathname;return!(!s||a.startsWith("/api/auth/callback")||!a.startsWith("/api/"))},new e.NetworkFirst({cacheName:"apis",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:16,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(function(e){var s=e.request,a=e.url.pathname,n=e.sameOrigin;return"1"===s.headers.get("RSC")&&"1"===s.headers.get("Next-Router-Prefetch")&&n&&!a.startsWith("/api/")},new e.NetworkFirst({cacheName:"pages-rsc-prefetch",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(function(e){var s=e.request,a=e.url.pathname,n=e.sameOrigin;return"1"===s.headers.get("RSC")&&n&&!a.startsWith("/api/")},new e.NetworkFirst({cacheName:"pages-rsc",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(function(e){var s=e.url.pathname;return e.sameOrigin&&!s.startsWith("/api/")},new e.NetworkFirst({cacheName:"pages",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(function(e){return!e.sameOrigin},new e.NetworkFirst({cacheName:"cross-origin",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:3600})]}),"GET")});


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
