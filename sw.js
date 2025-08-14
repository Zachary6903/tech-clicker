/* Service Worker for Tech Clicker */
const CACHE = 'tc-cache-v10';

const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;

  e.respondWith((async () => {
    const hit = await caches.match(r, { ignoreVary: true });
    if (hit) return hit;

    try {
      const net = await fetch(r);
      const c = await caches.open(CACHE);
      c.put(r, net.clone());
      return net;
    } catch (err) {
      const shell = await caches.match('./');
      return shell || new Response(
        '<!doctype html><meta charset="utf-8"><title>Offline</title><h1>Offline</h1>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  })());
});
