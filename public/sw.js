self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  // 네트워크 우선 전략 — 오프라인 시 기본 fallback 없음
  event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
});

self.addEventListener('push', function (event) {
  const data = event.data?.json() ?? {};
  const title = data.title || '풀무원다논 HR';
  const options = {
    body: data.body || '',
    icon: '/pulmuone-logo.png',
    badge: '/pulmuone-logo.png',
    tag: data.tag || 'hr-alarm',
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
