const CACHE_NAME = 'absensi-pwa-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  // Tambahkan semua ikon yang Anda gunakan di manifest di sini
  './android-chrome-192x192.png', 
  './android-chrome-512x512.png'
];

// Event: INSTALL - menginstal Service Worker dan menyimpan aset ke cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and cached files');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache files:', err);
      })
  );
});

// Event: FETCH - mencegat permintaan jaringan
self.addEventListener('fetch', event => {
  // Hanya melayani aset statis dari cache
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - kembalikan response dari cache
        if (response) {
          return response;
        }
        // Tidak ditemukan di cache - lakukan permintaan jaringan normal
        return fetch(event.request);
      })
  );
});

// Event: ACTIVATE - menghapus cache lama
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});