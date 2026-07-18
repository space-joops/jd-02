const CACHE_NAME = 'joops-cache-v3';
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
  // Navigation requests (HTML) -> Network First
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request).then(response => {
        // 캐시를 최신 상태로 갱신
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // 오프라인이거나 네트워크 실패 시 캐시된 버전 반환
        return caches.match(event.request);
      })
    );
    return;
  }

  // Other assets (JS, CSS, Images) -> Cache First, fallback to Network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Cache hit
        }
        
        // Cache miss
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(
          response => {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // 정적 에셋(Next.js 청크 등) 동적 캐싱
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            return response;
          }
        ).catch(() => {
          // 네트워크 에러 무시 (오프라인 상태 등)
        });
      })
  );
});
