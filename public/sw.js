self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};

  self.registration.showNotification(data.title || "Elysium", {
    body: data.body || "You have a notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });
});
