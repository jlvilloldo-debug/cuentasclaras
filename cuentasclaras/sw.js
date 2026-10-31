'use strict';
// Service worker de Cuentas Claras: permite abrir la app sin internet.
// Solo guarda en caché archivos de este mismo sitio; nunca datos del usuario.
var VERSION = 'cc-v2';
var BASICOS = ['./', 'index.html', 'manifest.webmanifest',
  'iconos/icono-192.png', 'iconos/icono-512.png', 'iconos/icono-maskable-512.png', 'iconos/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(BASICOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // nada de otros sitios

  // La página principal: primero internet (para recibir actualizaciones), si no hay, la copia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) {
      if (r.ok) { var copia = r.clone(); caches.open(VERSION).then(function (c) { c.put('index.html', copia); }); }
      return r;
    }).catch(function () { return caches.match('index.html'); }));
    return;
  }

  // Resto (lector de fotos, íconos): primero la copia guardada; si no está, se baja y se guarda.
  e.respondWith(caches.match(req).then(function (enCache) {
    return enCache || fetch(req).then(function (r) {
      if (r.ok && r.type === 'basic') { var copia = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); }
      return r;
    });
  }));
});
