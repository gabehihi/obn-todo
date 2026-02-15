// sw.js: Service Worker - 오프라인 캐싱

const CACHE_NAME = 'obn-todo-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './storage.js',
  './notification.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// 설치: 핵심 파일 캐싱
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 활성화: 이전 버전 캐시 삭제
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 가로채기: 캐시 우선, 네트워크 폴백
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
