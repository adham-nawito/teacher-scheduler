// Teacher Scheduler service worker.
//
// This file only needs to do two things: receive a push event while the app
// isn't open, and open/focus the app when the user taps the notification.
// It intentionally does NOT do any request caching / offline support — that
// would add complexity (cache invalidation, stale data) that isn't needed
// for this app, whose whole point is showing live, up-to-date session data.

self.addEventListener("install", () => {
  // Activate this version immediately instead of waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Session reminder", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Session reminder";
  const options = {
    body: data.body || "",
    icon: "/icon-512.png",
    badge: "/icon-512.png",
    tag: data.tag || "session-reminder",
    data: { url: data.url || "/calendar" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/calendar";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
