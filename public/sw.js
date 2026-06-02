const CACHE_NAME = "gonku-v2";

const STATIC_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/logo/logo-gonku.jpg",
];

const NETWORK_ONLY_PREFIXES = [
  "/api/",
  "/admin",
  "/kitchen",
  "/order",
  "/login",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (!request.url.startsWith("http")) return;

  const url = new URL(request.url);

  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname.includes("ngrok") ||
    url.hostname.startsWith("192.168.")
  ) {
    return;
  }

  if (request.method !== "GET") return;

  if (
    request.mode === "navigate" ||
    NETWORK_ONLY_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    event.respondWith(fetch(request));
    return;
  }

  if (
    request.destination === "image" ||
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (!response || response.status !== 200) return response;
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  event.respondWith(fetch(request));
});
