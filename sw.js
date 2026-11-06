/*
 * SWARANTARA service worker: makes the site work offline after one visit.
 *
 * Strategy: always try the network first (so a new version shows up straight
 * away), and fall back to the saved copy when offline or when the network is
 * very slow (weak exhibition Wi-Fi).
 *
 * When you change any file, bump VERSION.
 */
var VERSION = "swarantara-v3";
var NETWORK_TIMEOUT_MS = 4000;

// Note: no "index.html" or "404.html" here. Cloudflare Pages redirects those
// to "/" and "/404", and browsers refuse to show a redirected copy offline.
var FILES = [
  "./",
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
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(FILES.map(function (f) { return new Request(f, { cache: "reload" }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// A redirected response cannot be used to answer a page load, so store a clean copy.
function cleanCopy(res) {
  if (!res.redirected) return Promise.resolve(res);
  return res.blob().then(function (body) {
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  var isPage = req.mode === "navigate";

  e.respondWith(
    caches.open(VERSION).then(function (cache) {
      var fromCache = function () {
        return cache.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || (isPage ? cache.match("./") : undefined);
        });
      };

      var network = fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          return cleanCopy(res).then(function (clean) {
            cache.put(isPage ? "./" : req, clean.clone());
            return clean;
          });
        }
        return res;
      });

      // Whichever comes first: the network, or the timeout (then use the saved copy).
      var timeout = new Promise(function (resolve) {
        setTimeout(function () { fromCache().then(function (hit) { if (hit) resolve(hit); }); }, NETWORK_TIMEOUT_MS);
      });

      return Promise.race([
        network.catch(function () {
          return fromCache().then(function (hit) { return hit || Response.error(); });
        }),
        timeout
      ]);
    })
  );
});
