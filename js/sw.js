self.addEventListener('install', (event) => {
    console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (event) => {
    // Basic pass-through fetch so the app works normally
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

// Allow notification click to open/focus the app
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            if (clientList.length > 0) return clientList[0].focus();
            return clients.openWindow('/');
        })
    );
});