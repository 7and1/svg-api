const CACHE_VERSION = "v2";
const STATIC_CACHE = `svg-api-static-${CACHE_VERSION}`;
const API_CACHE = `svg-api-api-${CACHE_VERSION}`;
const ICONS_CACHE = `svg-api-icons-${CACHE_VERSION}`;
const OFFLINE_CACHE = `svg-api-offline-${CACHE_VERSION}`;

// Critical static assets to cache on install
const CRITICAL_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-touch-icon.png",
];

// Font patterns to cache
const FONT_PATTERNS = [
  /\/fonts\//,
  /\.woff2?$/,
  /_next\/static\/media\//,
];

// Install event - cache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(CRITICAL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith("svg-api-") &&
                ![STATIC_CACHE, API_CACHE, ICONS_CACHE, OFFLINE_CACHE].includes(name)
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Helper: Check if request is a font
function isFontRequest(request) {
  const url = request.url;
  return FONT_PATTERNS.some((pattern) => pattern.test(url));
}

// Helper: Check if request is an API request
function isAPIRequest(url) {
  return url.pathname.startsWith("/api/") || url.hostname === "api.svg-api.org";
}

// Helper: Check if request is an icon/SVG request
function isIconRequest(url) {
  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.includes("/svg/")
  );
}

// Strategy: Cache-first for static assets
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Refresh cache in background for non-critical assets
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      })
      .catch(() => {});
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

// Strategy: Stale-while-revalidate for API responses
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // Return cached response if network fails
      if (cached) {
        return cached;
      }
      throw new Error("Network error and no cache available");
    });

  // Return cached immediately, or wait for network if no cache
  return cached || fetchPromise;
}

// Strategy: Cache-first with 30-day expiration for icons
async function iconCacheStrategy(request) {
  const cache = await caches.open(ICONS_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const cachedDate = cached.headers.get("sw-cached-date");
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (cachedDate && Date.now() - new Date(cachedDate).getTime() < maxAge) {
      // Refresh in background
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const headers = new Headers(response.headers);
            headers.set("sw-cached-date", new Date().toISOString());
            const responseWithDate = new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers,
            });
            cache.put(request, responseWithDate);
          }
        })
        .catch(() => {});
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set("sw-cached-date", new Date().toISOString());
      const responseWithDate = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, responseWithDate);
    }
    return response;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Main fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (except for background sync)
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests except for API
  if (url.origin !== self.location.origin && !isAPIRequest(url)) {
    return;
  }

  // Handle API requests with stale-while-revalidate
  if (isAPIRequest(url)) {
    event.respondWith(
      staleWhileRevalidateStrategy(request, API_CACHE).catch(() => {
        return new Response(
          JSON.stringify({ error: "Offline", cached: false }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // Handle icon requests with cache-first + 30-day expiration
  if (isIconRequest(url)) {
    event.respondWith(
      iconCacheStrategy(request).catch(() => {
        return new Response(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
          {
            status: 200,
            headers: { "Content-Type": "image/svg+xml" },
          }
        );
      })
    );
    return;
  }

  // Handle font requests with cache-first
  if (isFontRequest(request)) {
    event.respondWith(
      cacheFirstStrategy(request, STATIC_CACHE).catch(() => {
        return new Response("", { status: 404 });
      })
    );
    return;
  }

  // Handle static assets (JS/CSS) with cache-first
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|webp)$/)
  ) {
    event.respondWith(
      cacheFirstStrategy(request, STATIC_CACHE).catch(() => {
        return new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // Handle navigation requests with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            // Cache successful navigation for offline use
            const cacheCopy = response.clone();
            caches.open(OFFLINE_CACHE).then((cache) => {
              cache.put(request, cacheCopy);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          // Return offline page
          const offlineResponse = await caches.match("/offline");
          if (offlineResponse) {
            return offlineResponse;
          }
          return new Response("You are offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // Default: Stale-while-revalidate for HTML pages
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const cacheCopy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Background Sync for favorites
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-favorites") {
    event.waitUntil(syncFavorites());
  }
});

// Push notification support
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "New update from SVG API",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    tag: data.tag || "default",
    requireInteraction: false,
    ...data.options,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "SVG API", options)
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handler for client communication
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }

  if (event.data?.type === "CACHE_OFFLINE_PAGE") {
    event.waitUntil(
      caches.open(OFFLINE_CACHE).then((cache) => cache.add("/offline"))
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "update-cache") {
    event.waitUntil(updateCaches());
  }
});

// Helper: Sync favorites from IndexedDB
async function syncFavorites() {
  // This would integrate with your IndexedDB favorites store
  // to sync with the server when back online
  try {
    const clients = await self.clients.matchAll({ type: "window" });
    if (clients.length > 0) {
      clients[0].postMessage({ type: "SYNC_FAVORITES" });
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// Helper: Update all caches
async function updateCaches() {
  const cacheNames = [STATIC_CACHE, API_CACHE, ICONS_CACHE];
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    await Promise.all(
      requests.map(async (request) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response);
          }
        } catch (error) {
          // Keep cached version on error
        }
      })
    );
  }
}
