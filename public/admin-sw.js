/* Service worker for /admin only: shows Coach's urgent alerts as phone
   notifications and opens the card when tapped. No caching, no fetch handler. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : 'Command centre' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Command centre', {
      body: data.body || '',
      icon: '/brand/icon-192.png',
      badge: '/brand/favicon-48.png',
      data: { url: data.url || '/admin' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/admin', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin + '/admin')) return w.navigate(url).then((c) => c && c.focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});
