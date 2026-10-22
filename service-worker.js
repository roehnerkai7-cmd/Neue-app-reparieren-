"use strict";

const CACHE_NAME = "bergfrieden-pwa-v9";
const RUNTIME_CACHE_NAME = "bergfrieden-runtime-v1";
const CACHEABLE_EXTERNAL_ORIGIN = "https://cdn.jsdelivr.net";
const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./language-support.js",
  "./lock-screen.js",
  "./brand-logo.png",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./images/cards/apfel.jpg",
  "./images/cards/birke.jpg",
  "./images/cards/birke.svg",
  "./images/cards/blume.jpg",
  "./images/cards/brot.jpg",
  "./images/cards/foto.jpg",
  "./images/cards/garten.jpg",
  "./images/cards/garten.svg",
  "./images/cards/handarbeit.jpg",
  "./images/cards/handarbeit.svg",
  "./images/cards/haus.jpg",
  "./images/cards/hund.jpg",
  "./images/cards/kamillentee.jpg",
  "./images/cards/kamillentee.svg",
  "./images/cards/katze.jpg",
  "./images/cards/milch.jpg",
  "./images/cards/musik.jpg",
  "./images/cards/samowar.jpg",
  "./images/cards/samowar.svg",
  "./images/cards/schal.jpg",
  "./images/cards/schal.svg",
  "./images/cards/schmerz.jpg",
  "./images/cards/schmerz.svg",
  "./images/cards/sonne.jpg",
  "./images/cards/suppe.jpg",
  "./images/cards/tee.jpg",
  "./images/cards/tee.svg",
  "./images/cards/toilette.jpg",
  "./images/cards/toilette.svg",
  "./images/cards/waerme.jpg",
  "./images/cards/waerme.svg",
  "./images/cards/wasser.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(async names => {
        const oldCaches = names.filter(name => name.startsWith("bergfrieden-pwa-") && name !== CACHE_NAME);
        const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
        for (const name of oldCaches) {
          const cache = await caches.open(name);
          for (const request of await cache.keys()) {
            if (new URL(request.url).origin !== CACHEABLE_EXTERNAL_ORIGIN) continue;
            const response = await cache.match(request);
            if (response) await runtimeCache.put(request, response);
          }
        }
        await Promise.all(oldCaches.map(name => caches.delete(name)));
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (request.method !== "GET") return;

  if (requestUrl.origin !== self.location.origin) {
    if (requestUrl.origin !== CACHEABLE_EXTERNAL_ORIGIN) return;
    event.respondWith(
      caches.open(RUNTIME_CACHE_NAME).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && requestUrl.pathname.startsWith(new URL("./", self.registration.scope).pathname)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
