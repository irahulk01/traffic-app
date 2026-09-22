// GatiLive Police Traffic Control - Service Worker
const CACHE_NAME = 'gatilive-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg'
];

// 1. Install & pre-cache shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-caching partial error:', err);
      });
    })
  );
});

// 2. Activate & cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch strategy: Network first with Cache fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Skip Google Maps and external API requests from full caching
  if (
    event.request.url.includes('maps.googleapis.com') ||
    event.request.url.includes('tile.openstreetmap.org')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// 4. Mobile OS Push Notification Event
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '🚨 GatiLive 50km Traffic Alert';
  const options = {
    body: data.body || 'Heavy congestion detected within your 50km zone.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'gatilive-traffic-alert',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      ...data,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Action (Bring app to foreground on mobile)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
