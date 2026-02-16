// storage.js: localStorage 래퍼 - 할 일 데이터 CRUD
// OBN v2.2 - scheduledDate 필드 추가, 날짜 기반 조회

window.Storage = (function () {
  const STORAGE_KEY = 'obn-todos';

  // crypto.randomUUID() 미지원 브라우저 대비 fallback
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

  // 오늘 날짜를 'YYYY-MM-DD' 형식으로 반환
  function getTodayString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // localStorage에서 할 일 배열 조회
  function getTodos() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // 할 일 배열을 localStorage에 저장
  function saveTodos(todos) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      alert('저장 공간이 부족합니다. 완료된 항목을 삭제해주세요.');
    }
  }

  // 새 할 일 생성 후 저장
  function addTodo(todoData) {
    const todos = getTodos();
    const todo = {
      id: generateUUID(),
      text: (todoData.text || '').slice(0, 100),
      category: todoData.category || '직장',
      priority: todoData.priority || '중간',
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      isRecurring: todoData.isRecurring || false,
      lastResetDate: todoData.isRecurring ? getTodayString() : null,
      scheduledDate: todoData.scheduledDate || getTodayString(),
    };
    todos.push(todo);
    saveTodos(todos);
    return todo;
  }

  // 특정 할 일 부분 업데이트
  function updateTodo(id, updates) {
    const todos = getTodos();
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return null;
    todos[index] = { ...todos[index], ...updates };
    saveTodos(todos);
    return todos[index];
  }

  // 특정 할 일 삭제
  function deleteTodo(id) {
    const todos = getTodos();
    const filtered = todos.filter((t) => t.id !== id);
    saveTodos(filtered);
  }

  // 완료 상태 토글 + completedAt 자동 설정
  function toggleTodo(id) {
    const todos = getTodos();
    const todo = todos.find((t) => t.id === id);
    if (!todo) return null;
    todo.completed = !todo.completed;
    todo.completedAt = todo.completed ? new Date().toISOString() : null;
    saveTodos(todos);
    return todo;
  }

  // 완료된 항목 일괄 삭제
  function clearCompleted() {
    const todos = getTodos().filter((t) => !t.completed);
    saveTodos(todos);
  }

  // 반복 할 일 매일 자정 리셋
  function resetRecurringTodos() {
    const todos = getTodos();
    const today = getTodayString();
    let changed = false;

    todos.forEach((t) => {
      if (t.isRecurring && t.lastResetDate !== today) {
        t.completed = false;
        t.completedAt = null;
        t.lastResetDate = today;
        changed = true;
      }
    });

    if (changed) saveTodos(todos);
    return changed;
  }

  // 기존 데이터에 scheduledDate가 없는 항목 마이그레이션
  function migrateTodos() {
    const todos = getTodos();
    let changed = false;

    todos.forEach((t) => {
      if (!t.scheduledDate) {
        if (t.createdAt) {
          t.scheduledDate = t.createdAt.slice(0, 10);
        } else {
          t.scheduledDate = getTodayString();
        }
        changed = true;
      }
    });

    if (changed) saveTodos(todos);
  }

  // 특정 날짜의 할 일 조회
  function getTodosByDate(dateString) {
    const todos = getTodos();
    return todos.filter((t) => t.scheduledDate === dateString || t.isRecurring);
  }

  // 주간 범위의 할 일 조회 (날짜별 그룹)
  function getTodosByWeek(startDate, endDate) {
    const todos = getTodos();
    const result = {};
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      result[key] = [];
    }

    todos.forEach((t) => {
      if (t.isRecurring) {
        Object.keys(result).forEach((key) => {
          result[key].push(t);
        });
      } else if (result.hasOwnProperty(t.scheduledDate)) {
        result[t.scheduledDate].push(t);
      }
    });

    return result;
  }

  // 기준 날짜가 포함된 주의 월~일 날짜 배열 반환 (한국식: 월요일 시작)
  function getWeekDates(referenceDate) {
    const ref = new Date(referenceDate);
    const day = ref.getDay(); // 0(일)~6(토)
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() + diffToMonday);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  // 통계 반환 (전체, 완료, 미완료, 진행률)
  function getStats() {
    const todos = getTodos();
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const remaining = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, remaining, percentage };
  }

  return {
    getTodos,
    saveTodos,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    clearCompleted,
    getStats,
    resetRecurringTodos,
    migrateTodos,
    getTodosByDate,
    getTodosByWeek,
    getWeekDates,
    getTodayString,
  };
})();
