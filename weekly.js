// weekly.js: 주간 달력 모듈 - 날짜 계산 및 주간 뷰 렌더링
// OBN v2.2 - 주간 달력, 바텀시트, 날짜 기반 계획

window.Weekly = (function () {
  let currentWeekStart = null; // 현재 보고 있는 주의 월요일 (Date)
  let selectedDate = null;     // 선택된 날짜 (YYYY-MM-DD)
  let onDateSelect = null;     // 날짜 선택 콜백
  let onDateClick = null;      // 날짜 셀 클릭 콜백

  // 주어진 날짜가 포함된 주의 월요일 반환
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0(일)~6(토)
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // currentWeekStart 기준 월~일 7개 Date 배열
  function getWeekDates() {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  // Date → 'YYYY-MM-DD' (로컬 시간 기준)
  function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Date → 'M/D' 형식
  function formatDisplayDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  // 현재 주의 범위 텍스트
  function getWeekRangeText() {
    const dates = getWeekDates();
    const mon = dates[0];
    const sun = dates[6];

    if (mon.getFullYear() !== sun.getFullYear()) {
      // 연도가 다른 경우: "2026년 12월 29일 ~ 2027년 1월 4일"
      return `${mon.getFullYear()}년 ${mon.getMonth() + 1}월 ${mon.getDate()}일 ~ ${sun.getFullYear()}년 ${sun.getMonth() + 1}월 ${sun.getDate()}일`;
    }
    if (mon.getMonth() === sun.getMonth()) {
      return `${mon.getMonth() + 1}월 ${mon.getDate()}일 ~ ${sun.getDate()}일`;
    }
    return `${mon.getMonth() + 1}월 ${mon.getDate()}일 ~ ${sun.getMonth() + 1}월 ${sun.getDate()}일`;
  }

  // 이전 주로 이동
  function goToPrevWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    // render()는 app.js에서 호출 (이중 렌더 방지)
  }

  // 다음 주로 이동
  function goToNextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    // render()는 app.js에서 호출 (이중 렌더 방지)
  }

  // 오늘 기준 주로 복귀
  function goToCurrentWeek() {
    currentWeekStart = getMonday(new Date());
    selectedDate = formatDate(new Date());
    // render()는 app.js에서 호출 (이중 렌더 방지)
  }

  // 날짜 선택 (외부에서 호출 시 사용)
  function selectDate(dateString) {
    selectedDate = dateString;
    // onDateSelect 콜백이 app.js render()를 호출하므로 여기서 render() 불필요
    if (onDateSelect) {
      onDateSelect(dateString);
    } else {
      render();
    }
  }

  // 날짜 선택 콜백 등록
  function setOnDateSelect(callback) {
    onDateSelect = callback;
  }

  // 날짜 셀 클릭 콜백 등록 (바텀시트 트리거)
  function setOnDateClick(callback) {
    onDateClick = callback;
  }

  // 현재 선택된 날짜 반환
  function getSelectedDate() {
    return selectedDate;
  }

  // 한글 카테고리 → CSS 클래스 매핑
  const CATEGORY_CSS = {
    '직장': 'cat-work',
    '공부': 'cat-study',
    '운동': 'cat-exercise',
    '식사': 'cat-meal',
    '약속': 'cat-appointment',
    '행사': 'cat-event',
    '약 복용': 'cat-medicine',
  };

  // 렌더링
  function render() {
    const weekRangeBtn = document.querySelector('#btn-week-range');
    const datesRow = document.querySelector('#week-dates-row');
    const schedulesRow = document.querySelector('#week-schedules-row');
    if (!weekRangeBtn || !datesRow || !schedulesRow) return;

    // [1] 주 범위 텍스트
    weekRangeBtn.textContent = getWeekRangeText();

    // 기본 데이터 준비
    const dates = getWeekDates();
    const todayStr = formatDate(new Date());
    const refMonth = currentWeekStart.getMonth();
    const startStr = formatDate(dates[0]);
    const endStr = formatDate(dates[6]);

    // D-Day 데이터 수집
    const ddayMap = {};
    if (window.DDay) {
      const ddays = DDay.getDDays().filter(function (d) { return d.isActive; });
      ddays.forEach(function (d) {
        if (d.targetDate >= startStr && d.targetDate <= endStr) {
          var diff = DDay.calculateDDay(d.targetDate);
          ddayMap[d.targetDate] = {
            text: diff === 0 ? 'D-Day' : DDay.formatDDay(diff),
            state: diff === 0 ? 'dday-today' : (diff > 0 ? 'dday-past' : ''),
          };
        }
      });
    }

    // 주간 할 일 데이터 (Storage 모듈이 없으면 빈 객체)
    var weekTodos = {};
    if (window.Storage && Storage.getTodosByWeek) {
      weekTodos = Storage.getTodosByWeek(startStr, endStr);
    }

    // [2] 날짜 셀 렌더링
    datesRow.innerHTML = '';
    dates.forEach(function (date) {
      var dateStr = formatDate(date);
      var cell = document.createElement('div');
      cell.className = 'week-date-cell';
      cell.dataset.date = dateStr;

      if (dateStr === todayStr) cell.classList.add('today');
      if (dateStr === selectedDate) cell.classList.add('selected');
      if (date.getMonth() !== refMonth) cell.classList.add('other-month');
      if (date.getDay() === 6) cell.classList.add('sat');
      if (date.getDay() === 0) cell.classList.add('sun');

      // 날짜 숫자
      var numSpan = document.createElement('span');
      numSpan.className = 'week-date-num';
      numSpan.textContent = date.getDate();
      cell.appendChild(numSpan);

      // 할 일 도트
      var todos = weekTodos[dateStr] || [];
      if (todos.length > 0) {
        var dot = document.createElement('span');
        dot.className = 'week-date-dot';
        cell.appendChild(dot);
      }

      // D-Day 마커
      if (ddayMap[dateStr]) {
        var marker = document.createElement('span');
        marker.className = 'week-dday-marker';
        if (ddayMap[dateStr].state) marker.classList.add(ddayMap[dateStr].state);
        marker.textContent = ddayMap[dateStr].text;
        cell.appendChild(marker);
      }

      // 클릭 이벤트
      cell.addEventListener('click', (function (ds) {
        return function () {
          selectedDate = ds;
          // onDateSelect 콜백이 app.js render()를 호출하고
          // 그 안에서 Weekly.render()도 호출되므로 여기서 직접 render() 불필요
          if (onDateSelect) {
            onDateSelect(ds);
          } else {
            render();
          }
          if (onDateClick) onDateClick(ds);
        };
      })(dateStr));

      datesRow.appendChild(cell);
    });

    // [3] 스케줄 바 렌더링
    schedulesRow.innerHTML = '';
    dates.forEach(function (date) {
      var dateStr = formatDate(date);
      var scheduleCell = document.createElement('div');
      scheduleCell.className = 'week-schedule-cell';

      var todos = weekTodos[dateStr] || [];
      if (todos.length > 0) {
        // 카테고리별 그룹핑 (중복 제거, 순서 유지, 반복 여부 추적)
        var seen = {};
        var catEntries = [];
        todos.forEach(function (t) {
          if (!seen[t.category]) {
            seen[t.category] = true;
            catEntries.push({ category: t.category, isRecurring: !!t.isRecurring });
          }
        });

        var maxBars = 3;
        var shown = catEntries.slice(0, maxBars);
        var overflow = catEntries.length - maxBars;

        shown.forEach(function (entry) {
          var bar = document.createElement('div');
          bar.className = 'schedule-bar ' + (CATEGORY_CSS[entry.category] || 'cat-work');
          if (entry.isRecurring) bar.classList.add('recurring');
          scheduleCell.appendChild(bar);
        });

        if (overflow > 0) {
          var more = document.createElement('span');
          more.className = 'schedule-more';
          more.textContent = '+' + overflow;
          scheduleCell.appendChild(more);
        }
      }

      schedulesRow.appendChild(scheduleCell);
    });
  }

  // 초기화
  function init() {
    currentWeekStart = getMonday(new Date());
    selectedDate = formatDate(new Date());
    onDateSelect = null;
    onDateClick = null;
    // render()는 app.js에서 콜백 등록 후 호출
  }

  return {
    init,
    render,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
    selectDate,
    getSelectedDate,
    setOnDateSelect,
    setOnDateClick,
    formatDate,
    getWeekDates,
    getWeekRangeText,
  };
})();
