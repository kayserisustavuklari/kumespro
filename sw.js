// KümesPro Service Worker v6.0
const CACHE = 'kumespro-v6';
const ASSETS = ['/', '/index.html', '/app.html', '/manifest.json',
  '/icon-192.png', '/icon-512.png', '/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  // Supabase ve Google isteklerini cache'leme
  if (e.request.url.includes('supabase.co') ||
      e.request.url.includes('google') ||
      e.request.url.includes('googleapis')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
