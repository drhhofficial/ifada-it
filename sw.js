// ══════════════════════════════════════════════════════
// Service Worker — إفادة IT
// وحدة تكنولوجيا المعلومات، كلية العلوم، جامعة طنطا
// ══════════════════════════════════════════════════════

const CACHE_NAME = "ifada-it-v1";

// الملفات اللي هتتخزن للعمل أوفلاين
const STATIC_ASSETS = [
  "./index.html",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;900&display=swap"
];

// ── Install ──
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch — Cache First for static, Network First for API ──
self.addEventListener("fetch", function(event) {
  var url = event.request.url;

  // طلبات Google Apps Script — دايماً من النت
  if (url.includes("script.google.com")) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(
          JSON.stringify({ error: "لا يوجد اتصال بالإنترنت. يُرجى المحاولة لاحقاً." }),
          { headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // باقي الملفات — من الكاش أولاً
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        // خزّن النسخة الجديدة
        if (response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
