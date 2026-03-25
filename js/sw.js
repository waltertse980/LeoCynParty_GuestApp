self.addEventListener('install', (event) => {
    console.log('Service Worker: Installed');
    self.skipWaiting();  // Activate immediately
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activated');
    event.waitUntil(self.clients.claim());  // Take control immediately
});

self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});

self.addEventListener('push', event => {
    let data = { title: '📢 Announcement', body: 'New update!' };
    try { data = event.data.json(); } catch(e) {}
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: './favicon_io/icon-192.png',
            badge: './favicon_io/icon-192.png',
            tag: 'party-update'
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            if (clientList.length > 0) return clientList[0].focus();
            return clients.openWindow('/');
        })
    );
});