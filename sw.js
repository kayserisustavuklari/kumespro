// KümesPro Service Worker v6.5
// Sadece PWA kurulum için - cache KULLANMIYOR
// Her açılışta taze veri çekilir

const CACHE_NAME = 'kumespro-v65';

self.addEventListener('install', () => {
  // Hemen aktif ol
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Tüm eski cache'leri sil
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch event YOK - tüm istekler ağdan gider, cache kullanılmaz
// Bu sayede her açılışta taze session kontrolü yapılır
