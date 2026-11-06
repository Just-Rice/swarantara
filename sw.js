/*
 * SWARANTARA service worker: makes the site work offline after one visit.
 * When you change any file, bump VERSION so phones fetch the new copy.
 */
var VERSION = "swarantara-v1";
var FILES = [
  "./",
  "index.html",
  "404.html",
  "css/style.css",
  "js/i18n.js",
  "js/melakarta.js",
  "js/katapayadi.js",
  "js/translit.js",
  "js/audio.js",
  "js/settings.js",
  "js/app.js",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/fonts/tiro-devanagari-sanskrit-devanagari-400-normal.woff2",
  "assets/fonts/tiro-devanagari-sanskrit-latin-400-normal.woff2",
  "assets/fonts/tiro-devanagari-sanskrit-latin-ext-400-normal.woff2"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Serve from cache straight away, and refresh the cache in the background.
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(function () {
          return hit || (req.mode === "navigate" ? cache.match("index.html") : undefined);
        });
        return hit || net;
      });
    })
  );
});
