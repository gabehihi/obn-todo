// notification.js: 푸시 알림 로직 - 12시/18시 리마인드 알림

window.NotificationManager = (function () {
  const STORAGE_KEY = 'obn-notification';
  const SENT_KEY = 'obn-notification-sent';

  let isEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';
  let checkInterval = null;

  const $ = (sel) => document.querySelector(sel);

  // 초기화: 토글 버튼 이벤트 등록, 알림 권한 요청
  function init() {
    updateToggleButton();
    $('#notification-toggle').addEventListener('click', toggle);

    if (isEnabled) {
      startChecking();
    }

    if ('Notification' in window) {
      requestPermission();
    }
  }

  // 브라우저 알림 권한 요청
  function requestPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // 알림 ON/OFF 토글
  function toggle() {
    isEnabled = !isEnabled;
    localStorage.setItem(STORAGE_KEY, isEnabled);
    updateToggleButton();

    if (isEnabled) {
      startChecking();
      requestPermission();
    } else {
      stopChecking();
    }
  }

  // 토글 버튼 텍스트 업데이트
  function updateToggleButton() {
    const btn = $('#notification-toggle');
    btn.textContent = isEnabled ? '🔔 알림 ON' : '🔕 알림 OFF';
  }

  // 1분 간격 시간 체크 시작
  function startChecking() {
    if (checkInterval) clearInterval(checkInterval);
    checkTime();
    checkInterval = setInterval(checkTime, 60000);
  }

  // 시간 체크 중지
  function stopChecking() {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }

  // 12시/18시 정각에 미완료 항목 확인 후 알림 발송
  function checkTime() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    if ((hour === 12 && minute === 0) || (hour === 18 && minute === 0)) {
      const sentKey = `${SENT_KEY}-${now.toDateString()}-${hour}`;
      if (localStorage.getItem(sentKey)) return;

      const todos = Storage.getTodos();
      const incomplete = todos.filter((t) => !t.completed);

      if (incomplete.length > 0) {
        sendNotification(incomplete);
        localStorage.setItem(sentKey, 'true');
      }
    }
  }

  // 브라우저 푸시 알림 발송 (5초 후 자동 닫기)
  function sendNotification(incompleteTodos) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const count = incompleteTodos.length;
    const top3 = incompleteTodos.slice(0, 3).map((t) => t.text).join(', ');
    const body = `미완료 ${count}개: ${top3}${count > 3 ? '...' : ''}`;

    const notification = new Notification('📋 오늘뿐인 나 - 리마인드', {
      body: body,
    });

    setTimeout(() => notification.close(), 5000);
  }

  return { init, toggle };
})();
