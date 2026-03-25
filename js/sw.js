// sw.js - Fixed version
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', event => {
  let data = { title: '📢 Party Update', body: 'New announcement!' };
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Push data parse error:', e);
  }
  
  const options = {
    body: data.body,
    icon: '/favicon_io/icon-192.png',
    badge: '/favicon_io/icon-192.png',
    tag: 'party-update',
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});