
const CACHE_NAME = "j-world-v1";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./j.js",
    "./manifest.webmanifest",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(APP_FILES);
            })
    );

    self.skipWaiting();

});

self.addEventListener("activate", function (event) {

    event.waitUntil(
        caches.keys().then(function (cacheNames) {

            return Promise.all(
                cacheNames.map(function (cacheName) {

                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }

                })
            );

        })
    );

    self.clients.claim();

});

self.addEventListener("fetch", function (event) {

    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request)
            .then(function (cachedResponse) {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request);

            })
            .catch(function () {

                if (event.request.mode === "navigate") {
                    return caches.match("./index.html");
                }

            })
    );

});