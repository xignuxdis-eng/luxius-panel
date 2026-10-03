/**
 * Service Worker — Luxius PWA (Fase 4, 02/10/2026)
 * 
 * Strategy: Cache-first for static assets (JS/CSS/fonts/images),
 * Network-first for API calls. Provides offline shell capability.
 */

const CACHE_NAME = 'luxius-v1791045898277';
const STATIC_ASSETS = [
    './',
    './index.html',
    './xignux_logo.png',
    './manifest.json',
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Network-first for API calls
    if (url.pathname.startsWith('/api')) {
        event.respondWith(
            fetch(request)
                .catch(() => caches.match(request))
        );
        return;
    }

    // Cache-first for static assets (JS, CSS, images, fonts)
    if (
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'image' ||
        request.destination === 'font' ||
        url.pathname.match(/\.(js|css|png|jpg|webp|svg|woff2?)$/i)
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    // Only cache successful same-origin responses
                    if (response.ok && url.origin === self.location.origin) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Navigation requests: try network, fall back to cached index.html (SPA)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Default: network with cache fallback
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});
