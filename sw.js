/*
 * SWARANTARA service worker: makes the site work offline after one visit.
 *
 * Strategy: always try the network first (so a new version shows up straight
 * away), and fall back to the saved copy when offline or when the network is
 * very slow (weak exhibition Wi-Fi).
 *
 * When you change any file, bump VERSION.
 */
var VERSION = "swarantara-v12";
var NETWORK_TIMEOUT_MS = 4000;

// Note: no "index.html" or "404.html" here. Cloudflare Pages redirects those
// to "/" and "/404", and browsers refuse to show a redirected copy offline.
// Pages are stored by their folder address ("./", "tala/", "swara/").
var FILES = [
  "./",
  "tala/",
  "css/tala.css",
  "js/tala.js",
  "swara/",
  "css/swara.css",
  "js/swara.js",
  "css/style.css",
  "js/i18n.js",
  "js/melakarta.js",
  "js/katapayadi.js",
  "js/translit.js",
  "js/audio.js",
  "js/settings.js",
  "js/app.js",
  "js/background.js",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/audio/tanpura-gs.mp3",
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

// The address a page is stored under: its folder, without "index.html" or "?…".
function pageKey(u) {
  var url = new URL(u, self.location.href);
  url.search = ""; url.hash = "";
  url.pathname = url.pathname.replace(/index\.html$/, "");
  return url.href;
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
        if (!isPage) return cache.match(req, { ignoreSearch: true });
        // A page: its own saved copy (with or without the final "/"), else the home page.
        var key = pageKey(req.url);
        return cache.match(key).then(function (hit) {
          return hit || (/\/$/.test(key) ? undefined : cache.match(key + "/"));
        }).then(function (hit) {
          return hit || cache.match("./");
        });
      };

      var network = fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          return cleanCopy(res).then(function (clean) {
            cache.put(isPage ? pageKey(res.url || req.url) : req, clean.clone());
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
