self.addEventListener('install', (event) => {
    console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (event) => {
    // Basic pass-through fetch so the app works normally
    event.respondWith(fetch(event.request));
});
