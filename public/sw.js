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
