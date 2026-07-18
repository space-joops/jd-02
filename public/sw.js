const CACHE_NAME = 'joops-cache-v1';
const urlsToCache = [
  '/',
  '/play',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // For navigation requests or requests for our cached assets
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request because it's a stream that can only be consumed once
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Optional: Clone the response to cache new requests dynamically
            // const responseToCache = response.clone();
            // caches.open(CACHE_NAME).then(cache => {
            //   cache.put(event.request, responseToCache);
            // });

            return response;
          }
        ).catch(() => {
          // If network fails and it's not in cache, fallback
          // For a simple PWA game, failing gracefully is usually fine
        });
      })
  );
});
