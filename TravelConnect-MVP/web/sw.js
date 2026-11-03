const CACHE = 'travelconnect-demo-v2';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest','./assets/logo.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))])));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  event.respondWith(fetch(event.request).then(response => { if(response.ok) { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request, copy)); } return response; }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));
});
