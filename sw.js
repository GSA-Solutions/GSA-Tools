// Service worker del inicio de GSA Tools. Subí VERSION si cambiás la lista SHELL.
const VERSION = 'v1';
const CACHE = 'gsa-home-' + VERSION;
const SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gsa-home-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Solo la pantalla de inicio: primero la red (ves los cambios nuevos), sin internet la copia guardada.
// Las subcarpetas (presupuestador, etc.) no se tocan: tienen su propio comportamiento.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const base = new URL('./', location.href).pathname;
  const rel = url.pathname.slice(base.length);
  const isHome = rel === '' || rel === 'index.html' || rel === 'config.js' || rel === 'manifest.webmanifest' || rel.startsWith('icon-');
  if (!isHome) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
