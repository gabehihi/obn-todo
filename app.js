// app.js: 메인 애플리케이션 로직 - UI 렌더링 및 이벤트 처리
// OBN v2.2 - 주간 달력, 바텀시트, 날짜 기반 계획

window.App = (function () {
  let currentFilter = '전체';
  let userManualCategory = false;
  let selectedDate = null; // 달력에서 선택된 날짜 (YYYY-MM-DD)
  let editingDDayId = null; // D-Day 수정 중인 항목 ID (null이면 추가 모드)

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

  // 카테고리별 키워드 매핑 (자동 분류용)
  const CATEGORY_KEYWORDS = {
    직장: ['회의', '출근', '퇴근', '보고', '업무', '프로젝트', '미팅', '출장', '야근', '회사', '사무실', '발표', '메일', '이메일', '상사', '팀장', '부장', '대리', '거래처', '계약', '서류'],
    공부: ['공부', '시험', '과제', '독서', '책', '강의', '수업', '학교', '학원', '영어', '수학', '토익', '자격증', '논문', '리포트', '숙제', '복습', '예습', '암기', '문제풀이'],
    운동: ['운동', '헬스', '러닝', '달리기', '산책', '조깅', '요가', '필라테스', '수영', '등산', '자전거', '스트레칭', '체육관', '피트니스', '근력', '유산소', '홈트', '플랭크', '스쿼트', '축구', '농구', '테니스', '배드민턴', '골프'],
    식사: ['밥', '식사', '점심', '저녁', '아침', '간식', '커피', '브런치', '도시락', '배달', '요리', '장보기', '마트', '반찬', '메뉴', '외식', '맛집', '디저트', '카페'],
    약속: ['약속', '만나', '만남', '모임', '친구', '데이트', '소개팅', '동창', '선약', '미용실', '병원', '치과', '안과', '피부과', '상담', '면접', '인터뷰'],
    행사: ['행사', '파티', '생일', '결혼', '축하', '기념일', '졸업', '입학', '세미나', '컨퍼런스', '페스티벌', '축제', '공연', '콘서트', '전시', '이벤트', '워크숍', '송별회', '환영회'],
    '약 복용': ['약', '복용', '비타민', '영양제', '처방', '알약', '유산균', '오메가', '철분', '칼슘', '혈압약', '감기약', '진통제', '연고', '안약']
  };

  // 텍스트에서 카테고리 자동 감지
  function detectCategory(text) {
    const normalized = text.toLowerCase().trim();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) {
          return category;
        }
      }
    }
    return null;
  }

  // 바텀시트 select value ↔ 한글 카테고리 매핑
  const CATEGORY_VALUE_MAP = {
    '직장': 'work', '공부': 'study', '운동': 'exercise', '식사': 'meal',
    '약속': 'appointment', '행사': 'event', '약 복용': 'medicine',
  };
  const CATEGORY_LABEL_MAP = {
    work: '직장', study: '공부', exercise: '운동', meal: '식사',
    appointment: '약속', event: '행사', medicine: '약 복용',
  };

  // 우선순위 매핑
  const PRIORITY_LABEL_MAP = { high: '높음', medium: '중간', low: '낮음' };

  // 우선순위 아이콘 매핑
  const PRIORITY_ICONS = { '높음': '🔴', '중간': '🟡', '낮음': '🟢' };

  // 우선순위 정렬 순서 (낮을수록 높은 우선순위)
  const PRIORITY_ORDER = { '높음': 0, '중간': 1, '낮음': 2 };

  const $ = (sel) => document.querySelector(sel);

  // 헤더 날짜 표시 (selectedDate 기준, 오늘이면 "(오늘)" 표시)
  function updateDate() {
    const today = new Date();
    const todayStr = Storage.getTodayString();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

    if (selectedDate && selectedDate !== todayStr) {
      const d = new Date(selectedDate + 'T00:00:00');
      const dateStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}`;
      $('#today-date').textContent = dateStr;
    } else {
      const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${days[today.getDay()]} (오늘)`;
      $('#today-date').textContent = dateStr;
    }
    return today.getDate();
  }

  // 앱 초기화: 날짜 표시, 이벤트 리스너 등록, 렌더링
  function init() {
    // 기존 데이터에 scheduledDate가 없는 항목 마이그레이션
    Storage.migrateTodos();

    // 반복 할 일 리셋 (날짜가 바뀌었으면 완료 초기화)
    Storage.resetRecurringTodos();

    // selectedDate를 오늘로 초기화
    selectedDate = Storage.getTodayString();

    let currentDay = updateDate();
    setInterval(() => {
      const now = new Date();
      if (now.getDate() !== currentDay) {
        currentDay = updateDate();
        Storage.resetRecurringTodos();
        render();
      }
    }, 60000);

    // 바텀시트 이벤트 리스너
    $('#fab-plan').addEventListener('click', () => openPlanSheet(null));
    $('#btn-plan-close').addEventListener('click', closePlanSheet);
    $('#plan-overlay').addEventListener('click', closePlanSheet);
    $('#btn-plan-add').addEventListener('click', handleAdd);
    $('#plan-todo-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });

    // 키워드 기반 자동 카테고리 분류
    const planInput = $('#plan-todo-input');
    const planCategory = $('#plan-category');

    planCategory.addEventListener('change', () => {
      userManualCategory = true;
    });

    planInput.addEventListener('input', () => {
      if (userManualCategory) return;
      const detected = detectCategory(planInput.value);
      if (detected) {
        const mapped = CATEGORY_VALUE_MAP[detected];
        if (mapped && planCategory.value !== mapped) {
          planCategory.value = mapped;
          planCategory.classList.remove('category-auto-detected');
          void planCategory.offsetWidth;
          planCategory.classList.add('category-auto-detected');
        }
      }
    });

    // Escape 키로 바텀시트 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const sheet = $('#plan-sheet');
        if (sheet.classList.contains('active')) {
          closePlanSheet();
          return;
        }
        if ($('#dday-modal').style.display !== 'none') {
          closeDDayModal();
        }
      }
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

    // 주간 달력 초기화
    if (window.Weekly) {
      Weekly.init();

      // 달력에서 날짜 클릭 → 바텀시트 열기 (해당 날짜로)
      Weekly.setOnDateClick(function (dateString) {
        openPlanSheet(dateString);
      });

      // 달력에서 날짜 선택 변경 → 할 일 리스트 필터링
      Weekly.setOnDateSelect(function (dateString) {
        selectedDate = dateString;
        render();
      });

      Weekly.render();
    }

    // 주 이동 버튼 이벤트
    var btnPrevWeek = document.getElementById('btn-prev-week');
    var btnNextWeek = document.getElementById('btn-next-week');
    var btnWeekRange = document.getElementById('btn-week-range');

    if (btnPrevWeek) btnPrevWeek.addEventListener('click', function () { Weekly.goToPrevWeek(); render(); });
    if (btnNextWeek) btnNextWeek.addEventListener('click', function () { Weekly.goToNextWeek(); render(); });
    if (btnWeekRange) btnWeekRange.addEventListener('click', function () {
      Weekly.goToCurrentWeek();
      selectedDate = Storage.getTodayString();
      render();
    });

    render();

    if (window.NotificationManager) {
      NotificationManager.init();
    }

  }

  // 바텀시트 열기
  function openPlanSheet(date) {
    const today = Storage.getTodayString();
    const dateValue = date || today;

    // D-Day 모달이 열려있으면 닫기
    if ($('#dday-modal').style.display !== 'none') closeDDayModal();

    $('#plan-todo-input').value = '';
    $('#plan-date-input').value = dateValue;
    $('#plan-recurring').checked = false;
    userManualCategory = false;

    // 선택된 날짜 갱신 → 리스트/헤더/진행률을 해당 날짜 기준으로 표시
    if (selectedDate !== dateValue) {
      selectedDate = dateValue;
      render();
    }

    const overlay = $('#plan-overlay');
    const sheet = $('#plan-sheet');

    overlay.style.display = 'block';
    sheet.style.display = 'block';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('active');
        sheet.classList.add('active');
      });
    });

    document.body.classList.add('sheet-open');
    setTimeout(() => $('#plan-todo-input').focus(), 350);
  }

  // 바텀시트 닫기
  function closePlanSheet() {
    const overlay = $('#plan-overlay');
    const sheet = $('#plan-sheet');

    overlay.classList.remove('active');
    sheet.classList.remove('active');
    document.body.classList.remove('sheet-open');

    setTimeout(() => {
      overlay.style.display = 'none';
      sheet.style.display = 'none';
    }, 350);
  }

  // 입력값을 검증하고 할 일 추가
  function handleAdd() {
    const input = $('#plan-todo-input');
    const text = input.value.trim();

    if (!text) {
      input.focus();
      input.classList.add('shake');
      input.style.borderColor = '#E74C3C';
      setTimeout(() => {
        input.style.borderColor = '';
        input.classList.remove('shake');
      }, 600);
      return;
    }

    const categoryKey = $('#plan-category').value;
    const priorityKey = $('#plan-priority').value;
    const category = CATEGORY_LABEL_MAP[categoryKey] || '직장';
    const priority = PRIORITY_LABEL_MAP[priorityKey] || '중간';
    const isRecurring = $('#plan-recurring').checked;
    const scheduledDate = $('#plan-date-input').value || Storage.getTodayString();

    const newTodo = Storage.addTodo({ text, category, priority, isRecurring, scheduledDate });
    userManualCategory = false;

    // 추가한 날짜로 selectedDate 설정하여 바로 보이도록
    selectedDate = scheduledDate;

    closePlanSheet();
    render(newTodo.id);
  }

  // 할 일 목록을 필터링, 정렬, DOM에 렌더링
  function render(newTodoId) {
    // 축1: 날짜 필터링
    let filtered = selectedDate
      ? Storage.getTodosByDate(selectedDate)
      : Storage.getTodos();

    // 축2: 카테고리 필터링
    if (currentFilter === 'recurring') {
      filtered = filtered.filter((t) => t.isRecurring);
    } else if (currentFilter !== '전체') {
      filtered = filtered.filter((t) => t.category === currentFilter);
    }

    // 정렬: 미완료 우선 → 우선순위 (높음 > 중간 > 낮음)
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1);
    });

    updateDate();
    updateProgress();

    const listEl = $('#todo-list');
    listEl.innerHTML = '';

    if (filtered.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = selectedDate
        ? '이 날은 계획이 없습니다. 🗓 계획을 추가해보세요!'
        : '오늘 할 일을 추가해보세요! ✨';
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

    // 주간 달력 스케줄 바 갱신
    if (window.Weekly) Weekly.render();
  }

  // 프로그레스 바와 텍스트 업데이트 (selectedDate 기준)
  function updateProgress() {
    let todos;
    let dateLabel = '';

    if (selectedDate) {
      todos = Storage.getTodosByDate(selectedDate);
      const d = new Date(selectedDate + 'T00:00:00');
      dateLabel = `${d.getMonth() + 1}/${d.getDate()} 기준 — `;
    } else {
      todos = Storage.getTodos();
    }

    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    const wrapper = document.querySelector('.progress-wrapper');
    if (wrapper) {
      wrapper.setAttribute('aria-valuenow', percentage);
    }
    $('#progress-fill').style.width = percentage + '%';
    $('#progress-text').textContent = `${dateLabel}${completed}/${total} 완료 (${percentage}%)`;
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
      deleteBtn.setAttribute('aria-label', d.title + ' 삭제');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`"${d.title}" D-Day를 삭제하시겠습니까?`)) {
          DDay.deleteDDay(d.id);
          renderDDays();
          if (window.Weekly) Weekly.render();
        }
      });

      // 카드 클릭 → 수정 모달 열기
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        openDDayModal(d);
      });

      card.append(emoji, title, count, deleteBtn);
      container.appendChild(card);
    });
  }

  // D-Day 추가/수정 모달 열기 (ddayData가 있으면 수정 모드)
  function openDDayModal(ddayData) {
    // 추가 모드일 때 3개 제한 체크
    if (!ddayData) {
      const activeDDays = DDay.getDDays().filter((d) => d.isActive);
      if (activeDDays.length >= 3) {
        alert('최대 3개까지 등록할 수 있습니다');
        return;
      }
    }

    // 바텀시트가 열려있으면 닫기
    if ($('#plan-sheet').classList.contains('active')) closePlanSheet();

    // 할 일 수정 모드가 열려있으면 닫기
    const editingItem = document.querySelector('.todo-item.editing');
    if (editingItem) render();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    $('#dday-date-input').min = `${yyyy}-${mm}-${dd}`;

    if (ddayData) {
      // 수정 모드: 기존 데이터로 채움
      editingDDayId = ddayData.id;
      $('.modal-title').textContent = '✏️ D-Day 수정';
      $('#btn-dday-save').textContent = '수정';
      $('#dday-title-input').value = ddayData.title;
      $('#dday-date-input').value = ddayData.targetDate;
      document.querySelectorAll('.emoji-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.emoji === ddayData.emoji);
      });
    } else {
      // 추가 모드: 빈 폼
      editingDDayId = null;
      $('.modal-title').textContent = '🎯 D-Day 추가';
      $('#btn-dday-save').textContent = '저장';
      $('#dday-title-input').value = '';
      $('#dday-date-input').value = '';
      document.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('active'));
      document.querySelector('.emoji-btn').classList.add('active');
    }

    $('#dday-modal').style.display = 'flex';
  }

  // D-Day 모달 닫기
  function closeDDayModal() {
    $('#dday-modal').style.display = 'none';
    editingDDayId = null;
  }

  // D-Day 저장 (추가 또는 수정)
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
      alert('목표 날짜는 오늘 이후여야 합니다.');
      $('#dday-date-input').focus();
      return;
    }

    const activeEmoji = document.querySelector('.emoji-btn.active');
    const emoji = activeEmoji ? activeEmoji.dataset.emoji : '🎯';

    if (editingDDayId) {
      // 수정 모드
      DDay.updateDDay(editingDDayId, { title, targetDate, emoji });
      editingDDayId = null;
    } else {
      // 추가 모드
      DDay.addDDay({ title, targetDate, emoji });
    }

    closeDDayModal();
    renderDDays();
    if (window.Weekly) Weekly.render();
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

  return { render, openPlanSheet, closePlanSheet };
})();
