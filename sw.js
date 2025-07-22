const CACHE_NAME = 'turf-admin-v1.0.0';
const urlsToCache = [
    '/',
    '/admin.html',
    '/manifest.json',
    '/turfadmin.png',
    '/turfadmin.png',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Message handling
self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Install Service Worker
self.addEventListener('install', event => {
    console.log('Admin SW installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened admin cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.log('Admin cache failed:', error);
            })
    );
    self.skipWaiting();
});

// Fetch Event - Network-first for HTML
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Network-first for HTML files (gets updates immediately)
    if (event.request.destination === 'document' || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(event.request, {
                cache: 'no-store'
            })
                .then(response => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, responseClone));
                    }
                    return response;
                })
                .catch(() => {
                    console.log('Network failed, using cache');
                    return caches.match(event.request) || caches.match('/admin.html');
                })
        );
    } else {
        // Cache-first for everything else
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    
                    const fetchRequest = event.request.clone();
                    
                    return fetch(fetchRequest).then(response => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    }).catch(() => {
                        return caches.match(event.request);
                    });
                })
        );
    }
});

// Activate Service Worker
self.addEventListener('activate', event => {
    console.log('Admin SW activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old admin cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Push notifications for admin
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'New admin notification!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'admin-notification',
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'view',
                title: 'View',
                icon: '/icons/icon-192x192.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/icons/icon-192x192.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Turf Admin', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/admin.html')
        );
    }
});
