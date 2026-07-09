/* ---------------------------------------------------------
   Minimal service worker — offline shell only.
   Never caches API responses (they are dynamic + must be fresh).
   --------------------------------------------------------- */
const CACHE = 'attendance-shell-v1';
const SHELL = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Never intercept Apps Script requests — always live.
  if (url.hostname.endsWith('script.google.com') ||
      url.hostname.endsWith('googleusercontent.com')) return;

  // Only handle GET
  if (req.method !== 'GET') return;

  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      // Cache same-origin static assets on the fly
      if (res && res.ok && url.origin === self.location.origin){
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
      }
      return res;
    }).catch(()=> cached))
  );
});
