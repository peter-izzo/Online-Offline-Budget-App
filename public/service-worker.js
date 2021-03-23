const FILES_TO_CACHE = [
    "/",
    "/manifest.webmanifest",
    "/index.html",
    "/assets/js/db.js",
    "/assets/js/index.js",
    "/assets/css/style.css",
    "/assets/icons/icon-192x192.png",
    "/assets/icons/icon-512x512.png",
    "/assets/img/icons/budget.png",
    "https://fonts.googleapis.com/icon?family=Material+Icons",
    "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css",
    "https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js",
    "https://cdn.jsdelivr.net/npm/chart.js@2.8.0"
];

const STATIC_CACHE = "static-cache-v1";
const RUNTIME_CACHE = "runtime-cache";

// install
self.addEventListener("install", event => {
    event.waitUntil(
        caches
        .open(STATIC_CACHE)
        .then(cache => cache.addAll(FILES_TO_CACHE))
        .then(() => self.skipWaiting())
    );
});

// activate
self.addEventListener("activate", event => {
    const currentCaches = [STATIC_CACHE, RUNTIME_CACHE];
    event.waitUntil(
        caches
        .keys()
        .then(cacheNames => {
          // return array of cache names that are old to delete
            return cacheNames.filter(
            cacheName => !currentCaches.includes(cacheName)
            );
        })
        .then(cachesToDelete => {
            return Promise.all(
                cachesToDelete.map(cacheToDelete => {
                    return caches.delete(cacheToDelete);
                })
            );
        })
        .then(() => self.clients.claim())
    );
});


// fetch
self.addEventListener("fetch", event => {
    if (
        event.request.method !== "GET" ||
        !event.request.url.startsWith(self.location.origin)
    ) {
        event.respondWith(fetch(event.request));
        return;
    }

    if (event.request.url.includes("/api/transaction")) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(cache => {
                return fetch(event.request)
            .then(response => {
                cache.put(event.request, response.clone());
                return response;
            })
                .catch(() => caches.match(event.request));
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return caches
            .open(RUNTIME_CACHE)
            .then(cache => {
                return fetch(event.request).then(response => {
                    return cache.put(event.request, response.clone()).then(() => {
                        return response;
                    });
                });
            });
        })
    );
});