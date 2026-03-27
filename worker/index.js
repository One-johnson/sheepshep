/* eslint-disable no-restricted-globals */
/* Custom service worker chunk (imported by next-pwa main SW): web push + notification click */

self.addEventListener("push", function (event) {
  var title = "SheepShep";
  var body = "";
  var url = "/dashboard/notifications";
  try {
    if (event.data) {
      var json = event.data.json();
      if (json.title) title = json.title;
      if (json.body) body = json.body;
      if (json.data && json.data.url) url = json.data.url;
    }
  } catch (_) {
    try {
      body = event.data && event.data.text ? event.data.text() : "";
    } catch (_) {}
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: "sheepshep-notification",
      renotify: true,
      data: { url: url },
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var path = data.url || "/dashboard/notifications";
  var fullUrl = new URL(path, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if ("focus" in client) {
          return client.focus().then(function () {
            return undefined;
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});
