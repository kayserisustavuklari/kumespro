// KümesPro Service Worker v6.0
// GitHub Pages: /kumespro/

const CACHE = 'kumespro-v6';
const BASE  = '/kumespro';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/app.html',
  BASE + '/manifest.json',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png',
  BASE + '/icon-180.png',
  BASE + '/icon-32.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(err => console.warn('[SW] Cache hatasi:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // API isteklerini cache'leme
  if (url.includes('supabase.co') ||
      url.includes('googleapis.com') ||
      url.includes('google.com') ||
      url.includes('gstatic.com')) {
    return;
  }
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request)
        .catch(() => cached))
  );
});
