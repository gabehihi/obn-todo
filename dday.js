// dday.js: D-Day 카운트다운 데이터 관리 모듈
// OBN v2.2 - 주간 달력, 바텀시트, 날짜 기반 계획

window.DDay = (function () {
  const STORAGE_KEY = 'obn-ddays';
  const MAX_ACTIVE = 3;
  const MAX_TITLE = 30;
  const EXPIRE_DAYS = 30;

  // UUID 생성 (crypto.randomUUID 미지원 브라우저 대비 폴백)
  function generateUUID() {
    if (crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // localStorage에서 D-Day 배열 가져오기
  function getDDays() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  // D-Day 배열을 localStorage에 저장
  function saveDDays(ddays) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ddays));
    } catch {
      alert('저장 공간이 부족합니다.');
    }
  }

  // 새 D-Day 추가 (활성 3개 제한, 미래 날짜만 허용)
  function addDDay(data) {
    const ddays = getDDays();
    const activeCount = ddays.filter((d) => d.isActive).length;
    if (activeCount >= MAX_ACTIVE) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(data.targetDate + 'T00:00:00');
    if (target <= today) return null;

    const newDDay = {
      id: generateUUID(),
      title: (data.title || '').slice(0, MAX_TITLE),
      targetDate: data.targetDate,
      emoji: data.emoji || '🎯',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    ddays.push(newDDay);
    saveDDays(ddays);
    return newDDay;
  }

  // 특정 D-Day 수정 (제목, 날짜, 이모지)
  function updateDDay(id, updates) {
    const ddays = getDDays();
    const index = ddays.findIndex((d) => d.id === id);
    if (index === -1) return null;
    if (updates.title !== undefined) ddays[index].title = (updates.title || '').slice(0, MAX_TITLE);
    if (updates.targetDate !== undefined) ddays[index].targetDate = updates.targetDate;
    if (updates.emoji !== undefined) ddays[index].emoji = updates.emoji;
    saveDDays(ddays);
    return ddays[index];
  }

  // 특정 D-Day 삭제
  function deleteDDay(id) {
    const ddays = getDDays().filter((d) => d.id !== id);
    saveDDays(ddays);
  }

  // D-Day 계산 (미래: 음수, 당일: 0, 경과: 양수)
  function calculateDDay(targetDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate + 'T00:00:00');
    const diffMs = today - target;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  // D-Day 포맷 문자열 반환
  function formatDDay(diff) {
    if (diff < 0) return 'D' + diff;
    if (diff === 0) return 'D-Day';
    return 'D+' + diff;
  }

  // 30일 이상 경과한 D-Day 비활성화
  function checkExpired() {
    const ddays = getDDays();
    let changed = false;

    ddays.forEach((d) => {
      if (d.isActive && calculateDDay(d.targetDate) >= EXPIRE_DAYS) {
        d.isActive = false;
        changed = true;
      }
    });

    if (changed) saveDDays(ddays);
    return ddays;
  }

  return { getDDays, saveDDays, addDDay, updateDDay, deleteDDay, calculateDDay, formatDDay, checkExpired };
})();
