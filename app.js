// app.js: 메인 애플리케이션 로직 - UI 렌더링 및 이벤트 처리

window.App = (function () {
  let currentFilter = '전체';

  // 카테고리 설정: 라벨, 아이콘, 색상
  const CATEGORIES = {
    '직장':   { label: '직장',   icon: '🏢', color: '#3498DB' },
    '공부':   { label: '공부',   icon: '📚', color: '#9B59B6' },
    '운동':   { label: '운동',   icon: '🏋️', color: '#2ECC71' },
    '식사':   { label: '식사',   icon: '🍜', color: '#E67E22' },
    '약속':   { label: '약속',   icon: '🤝', color: '#E74C3C' },
    '행사':   { label: '행사',   icon: '🎉', color: '#F1C40F' },
    '약 복용': { label: '약 복용', icon: '💊', color: '#1ABC9C' },
  };

  // 우선순위 아이콘 매핑
  const PRIORITY_ICONS = { '높음': '🔴', '중간': '🟡', '낮음': '🟢' };

  // 우선순위 정렬 순서 (낮을수록 높은 우선순위)
  const PRIORITY_ORDER = { '높음': 0, '중간': 1, '낮음': 2 };

  const $ = (sel) => document.querySelector(sel);

  // 오늘 날짜를 "YYYY년 M월 D일 요일" 형식으로 표시
  function updateDate() {
    const today = new Date();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${days[today.getDay()]}`;
    $('#today-date').textContent = dateStr;
    return today.getDate();
  }

  // 앱 초기화: 날짜 표시, 이벤트 리스너 등록, 렌더링
  function init() {
    let currentDay = updateDate();
    setInterval(() => {
      const now = new Date();
      if (now.getDate() !== currentDay) {
        currentDay = updateDate();
      }
    }, 60000);

    $('#add-btn').addEventListener('click', handleAdd);
    const todoInput = $('#todo-input');
    todoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });

    todoInput.addEventListener('focus', () => {
      setTimeout(() => {
        todoInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });

    document.querySelectorAll('.filter-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        render();
      });
    });

    $('#clear-completed-btn').addEventListener('click', clearCompleted);

    render();

    if (window.NotificationManager) {
      NotificationManager.init();
    }
  }

  // 입력값을 검증하고 할 일 추가
  function handleAdd() {
    const input = $('#todo-input');
    const text = input.value.trim();

    if (!text) {
      input.focus();
      input.style.borderColor = '#E74C3C';
      setTimeout(() => { input.style.borderColor = ''; }, 800);
      return;
    }

    const category = $('#category-select').value;
    const priority = $('#priority-select').value;

    const newTodo = Storage.addTodo({ text, category, priority });
    input.value = '';
    input.focus();
    render(newTodo.id);
  }

  // 할 일 목록을 필터링, 정렬, DOM에 렌더링
  function render(newTodoId) {
    const todos = Storage.getTodos();

    const filtered = currentFilter === '전체'
      ? todos
      : todos.filter((t) => t.category === currentFilter);

    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1);
    });

    updateProgress();

    const listEl = $('#todo-list');
    listEl.innerHTML = '';

    if (filtered.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = '오늘 할 일을 추가해보세요! ✨';
      listEl.appendChild(emptyMsg);
    } else {
      filtered.forEach((todo) => {
        const el = createTodoElement(todo);
        if (todo.id === newTodoId) {
          el.classList.add('slide-in');
        }
        listEl.appendChild(el);
      });
    }
  }

  // 프로그레스 바와 텍스트 업데이트
  function updateProgress() {
    const stats = Storage.getStats();
    const wrapper = document.querySelector('.progress-wrapper');
    if (wrapper) {
      wrapper.setAttribute('aria-valuenow', stats.percentage);
    }
    $('#progress-fill').style.width = stats.percentage + '%';
    $('#progress-text').textContent = `${stats.completed}/${stats.total} 완료 (${stats.percentage}%)`;
  }

  // 할 일 아이템 DOM 요소 생성
  function createTodoElement(todo) {
    const item = document.createElement('div');
    item.className = 'todo-item' + (todo.completed ? ' completed' : '');
    item.dataset.id = todo.id;
    item.setAttribute('role', 'listitem');

    const checkId = 'check-' + todo.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.id = checkId;
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', todo.text + ' 완료 여부');
    checkbox.addEventListener('change', () => {
      checkbox.classList.add('bounce');
      Storage.toggleTodo(todo.id);
      setTimeout(() => render(), 300);
    });

    const label = document.createElement('label');
    label.htmlFor = checkId;
    label.className = 'sr-only';
    label.textContent = todo.text;

    const text = document.createElement('span');
    text.className = 'todo-text' + (todo.completed ? ' completed' : '');
    text.textContent = todo.text;

    const badge = document.createElement('span');
    const catInfo = CATEGORIES[todo.category];
    badge.className = 'category-badge';
    badge.textContent = catInfo ? catInfo.icon + ' ' + catInfo.label : todo.category;
    badge.style.backgroundColor = catInfo ? catInfo.color : '#999';

    const priority = document.createElement('span');
    priority.className = 'priority-indicator';
    priority.textContent = PRIORITY_ICONS[todo.priority] || '🟡';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = '✏️';
    editBtn.setAttribute('aria-label', todo.text + ' 수정');
    editBtn.addEventListener('click', () => startEdit(todo, item));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = '🗑️';
    deleteBtn.setAttribute('aria-label', todo.text + ' 삭제');
    deleteBtn.addEventListener('click', () => {
      item.classList.add('slide-out');
      setTimeout(() => {
        Storage.deleteTodo(todo.id);
        render();
      }, 300);
    });

    item.append(checkbox, label, text, badge, priority, editBtn, deleteBtn);
    return item;
  }

  // 완료된 항목 일괄 삭제 (확인 후 실행)
  function clearCompleted() {
    const stats = Storage.getStats();
    if (stats.completed === 0) return;
    if (confirm(`완료된 ${stats.completed}개 항목을 삭제하시겠습니까?`)) {
      Storage.clearCompleted();
      render();
    }
  }

  // 인라인 수정 모드 진입 (텍스트, 카테고리, 우선순위 수정 가능)
  function startEdit(todo, itemEl) {
    const editingItem = document.querySelector('.todo-item.editing');
    if (editingItem) {
      const existingInput = editingItem.querySelector('.edit-input');
      if (existingInput) {
        const existingText = existingInput.value.trim();
        const existingId = editingItem.dataset.id;
        const selects = editingItem.querySelectorAll('.edit-select');
        if (existingText && existingId) {
          Storage.updateTodo(existingId, {
            text: existingText,
            category: selects[0] ? selects[0].value : undefined,
            priority: selects[1] ? selects[1].value : undefined,
          });
        }
      }
      render();
      const newItemEl = document.querySelector(`.todo-item[data-id="${todo.id}"]`);
      if (newItemEl) {
        itemEl = newItemEl;
      }
    }

    itemEl.classList.add('editing');

    const textEl = itemEl.querySelector('.todo-text');
    const badgeEl = itemEl.querySelector('.category-badge');
    const priorityEl = itemEl.querySelector('.priority-indicator');
    const editBtnEl = itemEl.querySelector('.btn-edit');
    const deleteBtnEl = itemEl.querySelector('.btn-delete');

    textEl.style.display = 'none';
    badgeEl.style.display = 'none';
    priorityEl.style.display = 'none';
    editBtnEl.style.display = 'none';
    deleteBtnEl.style.display = 'none';

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = todo.text;
    editInput.maxLength = 100;
    editInput.setAttribute('aria-label', '할 일 수정');

    const editCategory = document.createElement('select');
    editCategory.className = 'edit-select';
    editCategory.setAttribute('aria-label', '카테고리 수정');
    Object.keys(CATEGORIES).forEach((key) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = CATEGORIES[key].icon + ' ' + CATEGORIES[key].label;
      if (key === todo.category) opt.selected = true;
      editCategory.appendChild(opt);
    });

    const editPriority = document.createElement('select');
    editPriority.className = 'edit-select';
    editPriority.setAttribute('aria-label', '우선순위 수정');
    Object.keys(PRIORITY_ICONS).forEach((key) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      if (key === todo.priority) opt.selected = true;
      editPriority.appendChild(opt);
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-edit';
    saveBtn.textContent = '✅';
    saveBtn.setAttribute('aria-label', '수정 저장');
    saveBtn.addEventListener('click', () => saveEdit());

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-delete';
    cancelBtn.textContent = '❌';
    cancelBtn.setAttribute('aria-label', '수정 취소');
    cancelBtn.addEventListener('click', () => render());

    textEl.after(editInput, editCategory, editPriority, saveBtn, cancelBtn);
    editInput.focus();

    function saveEdit() {
      const newText = editInput.value.trim();
      if (!newText) return;
      Storage.updateTodo(todo.id, {
        text: newText,
        category: editCategory.value,
        priority: editPriority.value,
      });
      render();
    }

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveEdit();
      if (e.key === 'Escape') render();
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { render };
})();
