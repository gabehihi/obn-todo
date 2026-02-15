// storage.js: localStorage 래퍼 - 할 일 데이터 CRUD
// OBN v2.1 - D-Day 버그 수정, 캐시 갱신

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
  };
})();
