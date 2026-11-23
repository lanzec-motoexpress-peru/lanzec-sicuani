// Service worker de LANZEC MOTO EXPRESS: recibe notificaciones push aunque la página esté cerrada.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* sin caché: solo requerido para poder instalar la app */ });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'LANZEC MOTO EXPRESS', {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    vibrate: [250, 120, 250, 120, 250],
    requireInteraction: true,
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || 'index.html' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var target = new URL((e.notification.data && e.notification.data.url) || 'index.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.split('?')[0] === target.split('?')[0] && 'focus' in c) return c.focus();
    }
    for (var j = 0; j < list.length; j++) {
      if ('navigate' in list[j] && 'focus' in list[j]) return list[j].navigate(target).then(function (c) { return c && c.focus(); });
    }
    return self.clients.openWindow(target);
  }));
});
