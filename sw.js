// sw.js: Service Worker - 오프라인 캐싱 + 푸시 알림
// OBN v2.2 - 주간 달력, 바텀시트, 날짜 기반 계획

const CACHE_NAME = 'obn-todo-v2.2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './storage.js',
  './dday.js',
  './weekly.js',
  './notification.js',
  './manifest.json',
  './icon-32.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

const ALARM_HOURS = [12, 18];
const CHECK_INTERVAL = 60 * 1000;
let lastNotified = '';

// 설치: 핵심 파일 캐싱
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 활성화: 이전 버전 캐시 삭제 + 알림 타이머 시작
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
  checkAndNotify();
  setInterval(checkAndNotify, CHECK_INTERVAL);
});

// 요청 가로채기: 캐시 우선, 네트워크 폴백
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

// 알림 시간 체크 및 발송
function checkAndNotify() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (!ALARM_HOURS.includes(hour) || minute !== 0) return;

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const key = `${yyyy}-${mm}-${dd}-${hour}`;

  if (lastNotified === key) return;
  lastNotified = key;

  self.clients.matchAll({ type: 'window' }).then((clients) => {
    if (clients.length > 0) {
      clients[0].postMessage({ type: 'check-incomplete' });
    } else {
      self.registration.showNotification('📋 오늘뿐인 나 - 리마인드', {
        body: '완료하지 못한 할 일이 있는지 확인해보세요!',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'obn-reminder',
        data: { url: self.location.origin },
      });
    }
  });
}

// 알림 클릭: 앱 탭으로 포커스 또는 새 창 열기
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data && e.notification.data.url;
  if (!url) return;

  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.startsWith(url));
      if (existing) {
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// 메시지 수신: 앱에서 전달된 알림 요청 처리
self.addEventListener('message', (e) => {
  if (e.data.type === 'show-notification') {
    self.registration.showNotification(e.data.title || '📋 오늘뿐인 나', {
      body: e.data.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: 'obn-reminder',
      data: { url: self.location.origin },
    });
  }

  if (e.data.type === 'incomplete-count') {
    const count = e.data.count || 0;
    if (count > 0) {
      const items = e.data.items || '';
      self.registration.showNotification('📋 오늘뿐인 나 - 리마인드', {
        body: `미완료 ${count}개: ${items}`,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'obn-reminder',
        data: { url: self.location.origin },
      });
    }
  }
});
