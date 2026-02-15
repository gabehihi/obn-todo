// app.js: 메인 애플리케이션 로직 - UI 렌더링 및 이벤트 처리
// OBN v2.0 - 스마트 푸시 알림, 반복 할 일, D-Day 카운트다운, 커스텀 아이콘

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
    // 반복 할 일 리셋 (날짜가 바뀌었으면 완료 초기화)
    Storage.resetRecurringTodos();

    let currentDay = updateDate();
    setInterval(() => {
      const now = new Date();
      if (now.getDate() !== currentDay) {
        currentDay = updateDate();
        Storage.resetRecurringTodos();
        render();
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

    // 반복 체크박스 토글
    $('#recurring-checkbox').addEventListener('change', (e) => {
      $('#recurring-hint').style.display = e.target.checked ? 'inline' : 'none';
    });

    // D-Day 초기화
    DDay.checkExpired();
    renderDDays();
    $('#btn-add-dday').addEventListener('click', openDDayModal);
    $('#btn-dday-save').addEventListener('click', saveDDay);
    $('#btn-dday-cancel').addEventListener('click', closeDDayModal);
    $('#dday-modal').addEventListener('click', (e) => {
      if (e.target === $('#dday-modal')) closeDDayModal();
    });
    document.querySelectorAll('.emoji-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('#dday-modal').style.display !== 'none') {
        closeDDayModal();
      }
    });

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
    const isRecurring = $('#recurring-checkbox').checked;

    const newTodo = Storage.addTodo({ text, category, priority, isRecurring });
    input.value = '';
    $('#recurring-checkbox').checked = false;
    $('#recurring-hint').style.display = 'none';
    input.focus();
    render(newTodo.id);
  }

  // 할 일 목록을 필터링, 정렬, DOM에 렌더링
  function render(newTodoId) {
    const todos = Storage.getTodos();

    let filtered;
    if (currentFilter === '전체') {
      filtered = todos;
    } else if (currentFilter === 'recurring') {
      filtered = todos.filter((t) => t.isRecurring);
    } else {
      filtered = todos.filter((t) => t.category === currentFilter);
    }

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
      if (todo.isRecurring) {
        if (!confirm('반복 할 일을 삭제하시겠습니까? 매일 리셋이 중단됩니다.')) return;
      }
      item.classList.add('slide-out');
      setTimeout(() => {
        Storage.deleteTodo(todo.id);
        render();
      }, 300);
    });

    item.append(checkbox, label);
    if (todo.isRecurring) {
      const recurBadge = document.createElement('span');
      recurBadge.className = 'todo-recurring-badge';
      recurBadge.textContent = '🔁';
      item.appendChild(recurBadge);
    }
    item.append(text, badge, priority, editBtn, deleteBtn);
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

  // D-Day 카드 렌더링
  function renderDDays() {
    const ddays = DDay.getDDays().filter((d) => d.isActive);
    ddays.sort((a, b) => a.targetDate.localeCompare(b.targetDate));

    const container = $('#dday-container');
    const section = $('#dday-section');
    container.innerHTML = '';

    if (ddays.length === 0) {
      return;
    }

    ddays.forEach((d) => {
      const diff = DDay.calculateDDay(d.targetDate);
      const card = document.createElement('div');
      card.className = 'dday-card';
      if (diff === 0) card.classList.add('today');

      const emoji = document.createElement('span');
      emoji.className = 'dday-emoji';
      emoji.textContent = d.emoji;

      const title = document.createElement('span');
      title.className = 'dday-title';
      title.textContent = d.title;

      const count = document.createElement('span');
      count.className = 'dday-count';
      if (diff === 0) {
        count.textContent = '🔥 D-Day!';
        count.classList.add('urgent');
      } else {
        count.textContent = DDay.formatDDay(diff);
        if (diff > -8 && diff < 0) count.classList.add('urgent');
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'dday-delete';
      deleteBtn.textContent = '×';
      deleteBtn.dataset.id = d.id;
      deleteBtn.setAttribute('aria-label', d.title + ' 삭제');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`"${d.title}" D-Day를 삭제하시겠습니까?`)) {
          DDay.deleteDDay(d.id);
          renderDDays();
        }
      });

      card.append(emoji, title, count, deleteBtn);
      container.appendChild(card);
    });
  }

  // D-Day 추가 모달 열기
  function openDDayModal() {
    const activeDDays = DDay.getDDays().filter((d) => d.isActive);
    if (activeDDays.length >= 3) {
      alert('최대 3개까지 등록할 수 있습니다');
      return;
    }

    // 수정 모드가 열려있으면 닫기
    const editingItem = document.querySelector('.todo-item.editing');
    if (editingItem) render();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    $('#dday-date-input').min = `${yyyy}-${mm}-${dd}`;

    $('#dday-title-input').value = '';
    $('#dday-date-input').value = '';
    document.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('active'));
    document.querySelector('.emoji-btn').classList.add('active');

    $('#dday-modal').style.display = 'flex';
  }

  // D-Day 추가 모달 닫기
  function closeDDayModal() {
    $('#dday-modal').style.display = 'none';
  }

  // D-Day 저장
  function saveDDay() {
    const title = $('#dday-title-input').value.trim();
    const targetDate = $('#dday-date-input').value;

    if (!title) {
      $('#dday-title-input').focus();
      return;
    }

    if (!targetDate) {
      $('#dday-date-input').focus();
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(targetDate + 'T00:00:00') <= today) {
      $('#dday-date-input').focus();
      return;
    }

    const activeEmoji = document.querySelector('.emoji-btn.active');
    const emoji = activeEmoji ? activeEmoji.dataset.emoji : '🎯';

    DDay.addDDay({ title, targetDate, emoji });
    closeDDayModal();
    renderDDays();
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

    const editRecurring = document.createElement('label');
    editRecurring.className = 'recurring-label';
    editRecurring.style.fontSize = '12px';
    const editRecurCheck = document.createElement('input');
    editRecurCheck.type = 'checkbox';
    editRecurCheck.className = 'recurring-checkbox';
    editRecurCheck.checked = todo.isRecurring || false;
    editRecurCheck.setAttribute('aria-label', '반복 여부 수정');
    const editRecurText = document.createElement('span');
    editRecurText.textContent = '🔁 반복';
    editRecurring.append(editRecurCheck, editRecurText);

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

    textEl.after(editInput, editCategory, editPriority, editRecurring, saveBtn, cancelBtn);
    editInput.focus();

    function saveEdit() {
      const newText = editInput.value.trim();
      if (!newText) return;
      Storage.updateTodo(todo.id, {
        text: newText,
        category: editCategory.value,
        priority: editPriority.value,
        isRecurring: editRecurCheck.checked,
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
