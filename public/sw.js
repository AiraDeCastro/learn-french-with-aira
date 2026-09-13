// Minimal service worker for the daily-reminder Web Push feature (PRD §7).
// Registered from the dashboard's reminder opt-in — see
// src/app/dashboard/_components/ReminderSettings.tsx.

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Learn French with Aira";
  const options = {
    body: data.body || "Your French is waiting for you today.",
    icon: "/next.svg",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
