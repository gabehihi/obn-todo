// notification.js: Service Worker 기반 푸시 알림 관리
// OBN v2.0 - 스마트 푸시 알림, 반복 할 일, D-Day 카운트다운, 커스텀 아이콘

window.NotificationManager = (function () {
  const STORAGE_KEY = 'obn-notification';

  let isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
  let swRegistration = null;

  const $ = (sel) => document.querySelector(sel);

  // 초기화: 토글 버튼 이벤트, SW 등록, 메시지 리스너
  function init() {
    $('#notification-toggle').addEventListener('click', toggle);
    updateToggleButton();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        swRegistration = reg;
      });
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    if (isEnabled && 'Notification' in window && Notification.permission === 'default') {
      requestPermission();
    }
  }

  // 알림 ON/OFF 토글
  function toggle() {
    isEnabled = !isEnabled;
    localStorage.setItem(STORAGE_KEY, isEnabled);
    updateToggleButton();

    if (isEnabled) {
      requestPermission();
    }
  }

  // 토글 버튼 텍스트 업데이트
  function updateToggleButton() {
    const btn = $('#notification-toggle');
    btn.textContent = isEnabled ? '🔔 알림 ON' : '🔕 알림 OFF';
  }

  // 알림 권한 요청
  function requestPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((result) => {
        if (result === 'denied') {
          alert('알림이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.');
          isEnabled = false;
          localStorage.setItem(STORAGE_KEY, isEnabled);
          updateToggleButton();
        }
      });
    } else if (Notification.permission === 'denied') {
      alert('알림이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.');
      isEnabled = false;
      localStorage.setItem(STORAGE_KEY, isEnabled);
      updateToggleButton();
    }
  }

  // SW에서 온 메시지 처리
  function handleSWMessage(event) {
    if (event.data.type === 'check-incomplete') {
      if (!isEnabled) return;

      const todos = Storage.getTodos();
      const incomplete = todos.filter((t) => !t.completed);
      const count = incomplete.length;
      const items = incomplete.slice(0, 3).map((t) => t.text).join(', ') +
        (count > 3 ? '...' : '');

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'incomplete-count',
          count: count,
          items: items,
        });
      }
    }
  }

  // 디버깅용 테스트 알림
  function sendTestNotification() {
    if (swRegistration) {
      swRegistration.showNotification('테스트 알림', {
        body: '알림이 정상 작동합니다!',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'obn-test',
      });
    }
  }

  return { init, toggle, sendTestNotification };
})();
