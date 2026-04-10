// BioForce PWA Service Worker — Network-first, Bilder immer frisch laden
const CACHE_NAME = 'bioforce-v9';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Bilder: IMMER vom Netzwerk laden — nie cachen (neue Übungen sollen sofort erscheinen)
  if (url.includes('/Bilder/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response('', {status: 404});
      })
    );
    return;
  }

  // GitHub API und raw.githubusercontent: nie cachen
  if (url.includes('api.github.com') || url.includes('raw.githubusercontent.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // App-Dateien: Network-first
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
