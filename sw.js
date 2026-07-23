// KümesPro Service Worker v7.4
const CACHE = 'kumespro-v74';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Fetch: sadece HTML dosyaları için network-first (cache YOK)
// Bu sayede her açılışta taze session kontrolü yapılır
