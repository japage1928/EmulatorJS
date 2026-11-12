"use strict";

// Service worker: caches the app shell and the EmulatorJS frontend so the
// library opens offline. Emulator core files are large and version-pinned,
// so they are stored in the cache the first time each one is fetched and
// served from there afterwards.

const CACHE_NAME = "ejs-fork-v1";

const PRECACHE = [
    "./",
    "index.html",
    "library.js",
    "library.css",
    "manifest.webmanifest",
    "docs/Logo.png",
    "docs/favicon.ico",
    "data/loader.js",
    "data/emulator.min.js",
    "data/emulator.min.css",
    "data/version.json"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Pinned emulator payload: cache-first, it does not change between deploys.
    if (url.pathname.includes("/data/cores/") || url.pathname.includes("/data/localization/")) {
        event.respondWith(
            caches.match(req, { ignoreSearch: true }).then((hit) => {
                if (hit) return hit;
                return fetch(req).then((res) => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                    }
                    return res;
                });
            })
        );
        return;
    }

    // Everything else: network first, fall back to the cache when offline.
    event.respondWith(
        fetch(req).then((res) => {
            if (res.ok) {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
            }
            return res;
        }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
});
