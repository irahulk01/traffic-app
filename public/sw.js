// GatiLive Police Traffic Control - Service Worker
const CACHE_NAME = 'gatilive-shell-v3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/apple-touch-icon.png'
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
          if (key.startsWith('gatilive-') && key !== CACHE_NAME) {
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

  const url = new URL(event.request.url);
  // Never replay a cached traffic response as if it were a new observation.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

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
        if (networkResponse && networkResponse.status === 200 && !networkResponse.headers.get('Cache-Control')?.includes('no-store')) {
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
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'GatiLive traffic update';
  const options = {
    body: data.body || 'An update is available for a monitored route.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || 'gatilive-traffic-alert',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: '/traffic-map',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Action (Bring app to foreground on mobile)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL('/traffic-map', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
