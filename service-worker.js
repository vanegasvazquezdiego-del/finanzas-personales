/* Service Worker — Finanzas Personales PWA (cache-first con fallback offline) */
const CACHE_NAME = 'finanzas-pwa-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/tailwind.css',
  './vendor/chart.umd.min.js',
  './vendor/jspdf.umd.min.js',
  './vendor/jspdf-autotable.min.js',
  './js/store.js',
  './js/charts.js',
  './js/transactions.js',
  './js/advisor.js',
  './js/pwa.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Red primero: los cambios publicados se ven de inmediato;
  // si no hay conexión, se usa la caché (offline).
  event.respondWith(
    fetch(request)
      .then((res) => {
        // Solo cachea respuestas del mismo origen y OK
        if (res && res.status === 200 && new URL(request.url).origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
