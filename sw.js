// KümesPro Service Worker v7.12
const CACHE = 'kumespro-v712';

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

// Web Push — yalnızca web/PWA kullanıcıları abone olabilir (APK kendi native bildirimini kullanır)
self.addEventListener('push', (e) => {
  let data = { title: 'KümesPro', body: 'Yeni bildirim' };
  try { if (e.data) data = e.data.json(); } catch (err) { /* varsayılan kullanılır */ }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/kumespro/logo_.png',
      badge: '/kumespro/logo_.png',
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/kumespro/') && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/kumespro/app.html');
    })
  );
});
