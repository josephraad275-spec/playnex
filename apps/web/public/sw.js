const CACHE = "playnex-shell-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/icon.svg", "/manifest.webmanifest"])),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
// Only public static artwork is cached. Invitations, authenticated API responses,
// room states and HTML are never cached by this worker.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin === self.location.origin &&
    ["/icon.svg", "/manifest.webmanifest"].includes(url.pathname)
  )
    event.respondWith(
      caches
        .match(event.request)
        .then((value) => value || fetch(event.request)),
    );
});
