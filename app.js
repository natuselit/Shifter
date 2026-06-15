const defaultSettings = {
  rate: 0,
  startHoldSeconds: 3,
  endHoldSeconds: 5,
  surname: ''
};

const navItems = [
  {
    href: 'index.html',
    label: 'Зміна',
    icon: '<path d="M12 8v4l2.5 2.5"></path><circle cx="12" cy="12" r="9"></circle>'
  },
  {
    href: 'history.html',
    label: 'Історія',
    icon: '<path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path>'
  },
  {
    href: 'salary.html',
    label: 'Зарплата',
    icon: '<path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"></path>'
  },
  {
    href: 'analytics.html',
    label: 'Аналітика',
    icon: '<path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M8 16v-5"></path><path d="M12 16V8"></path><path d="M16 16v-3"></path>'
  },
  {
    href: 'settings.html',
    label: 'Налаштування',
    icon: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"></path><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.8a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.8a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 16 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.4.25.68.61.8 1.02.13.4.13.84 0 1.23-.12.4-.4.77-.8 1.02Z"></path>'
  }
];

function clampHoldSeconds(value, fallback) {
  const seconds = Math.round(Number(value));

  if (!Number.isFinite(seconds)) return fallback;

  return Math.min(10, Math.max(1, seconds));
}

function normalizeSettingsValue(settings) {
  return {
    rate: Number(settings.rate) || 0,
    startHoldSeconds: clampHoldSeconds(settings.startHoldSeconds, defaultSettings.startHoldSeconds),
    endHoldSeconds: clampHoldSeconds(settings.endHoldSeconds, defaultSettings.endHoldSeconds),
    surname: String(settings.surname || '').trim()
  };
}

function readJsonStorage(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue === null ? fallback : JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}

const storage = {
  get settings() {
    return normalizeSettingsValue(readJsonStorage('settings', {}));
  },
  set settings(value) {
    localStorage.setItem('settings', JSON.stringify(value));
  },
  get startedAt() {
    return Number(localStorage.getItem('startedAt')) || null;
  },
  set startedAt(value) {
    if (value) {
      localStorage.setItem('startedAt', String(value));
    } else {
      localStorage.removeItem('startedAt');
    }
  },
  get activeRate() {
    const rate = Number(localStorage.getItem('activeRate'));
    return Number.isFinite(rate) && rate >= 0 ? rate : null;
  },
  set activeRate(value) {
    const rate = Number(value);
    if (Number.isFinite(rate) && rate >= 0) {
      localStorage.setItem('activeRate', String(rate));
    } else {
      localStorage.removeItem('activeRate');
    }
  },
  get lastShift() {
    return readJsonStorage('lastShift', null);
  },
  set lastShift(value) {
    if (value) {
      localStorage.setItem('lastShift', JSON.stringify(value));
    } else {
      localStorage.removeItem('lastShift');
    }
  },
  get shifts() {
    const shifts = readJsonStorage('shifts', []);
    return Array.isArray(shifts) ? shifts : [];
  },
  set shifts(value) {
    localStorage.setItem('shifts', JSON.stringify(value));
  },
  get doubleRate() {
    return localStorage.getItem('doubleRate') === 'true';
  },
  set doubleRate(value) {
    localStorage.setItem('doubleRate', String(Boolean(value)));
  },
  get rateMultiplier() {
    const value = Number(localStorage.getItem('rateMultiplier'));
    if (value === 1.5 || value === 2) return value;
    return this.doubleRate ? 2 : 1;
  },
  set rateMultiplier(value) {
    const multiplier = normalizeRateMultiplier(value);
    localStorage.setItem('rateMultiplier', String(multiplier));
    localStorage.setItem('doubleRate', String(multiplier === 2));
  }
};

function createShiftId() {
  if (globalThis.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSettings() {
  const settings = storage.settings;

  storage.settings = settings;
  if (!storage.startedAt) {
    storage.activeRate = null;
  }
  localStorage.removeItem('activeBreaks');
  localStorage.removeItem('airAlarmStartedAt');
  localStorage.removeItem('airAlarmMs');
  localStorage.removeItem('airAlarmIntervals');
}

function normalizeShifts() {
  const shifts = storage.shifts;
  let changed = false;

  const normalized = shifts.map((shift, index) => {
    const normalizedShift = normalizeShiftValue(shift, index);
    if (!normalizedShift) {
      changed = true;
      return null;
    }
    const {
      surname,
      alarmIntervals,
      airAlarmMs,
      breaks,
      ...shiftWithoutRemovedFields
    } = normalizedShift;
    const rateMultiplier = normalizeRateMultiplier(normalizedShift.rateMultiplier ?? (normalizedShift.doubleRate ? 2 : 1));

    if (
      normalizedShift.id &&
      normalizedShift.shiftType &&
      normalizedShift.rateMultiplier === rateMultiplier &&
      surname === undefined &&
      alarmIntervals === undefined &&
      airAlarmMs === undefined &&
      breaks === undefined
    ) {
      return shiftWithoutRemovedFields;
    }

    changed = true;
    return {
      ...shiftWithoutRemovedFields,
      id: normalizedShift.id || `${normalizedShift.startedAt}-${normalizedShift.endedAt}-${index}`,
      shiftType: normalizedShift.shiftType || detectShiftType(normalizedShift.startedAt),
      rateMultiplier,
      doubleRate: rateMultiplier === 2
    };
  }).filter(Boolean);

  const sorted = [...normalized].sort((firstShift, secondShift) => secondShift.startedAt - firstShift.startedAt);

  if (changed || sorted.some((shift, index) => shift !== normalized[index])) {
    storage.shifts = sorted;
    storage.lastShift = sorted[0] || null;
  }
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatShortDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${minutes}`;
  }

  return `${minutes}:${seconds}`;
}

function formatHoursMinutes(milliseconds) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function formatMonth(date) {
  return new Intl.DateTimeFormat('uk-UA', {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function formatDateOnly(timestamp) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(timestamp));
}

function formatShortDate(timestamp) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(timestamp));
}

function formatTimeOnly(timestamp) {
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function formatShiftPeriod(startedAt, endedAt) {
  if (getDateKey(startedAt) === getDateKey(endedAt)) {
    return `${formatShortDate(startedAt)} · ${formatTimeOnly(startedAt)}-${formatTimeOnly(endedAt)}`;
  }

  return `${formatShortDate(startedAt)} ${formatTimeOnly(startedAt)} - ${formatShortDate(endedAt)} ${formatTimeOnly(endedAt)}`;
}

function formatDateTimeInput(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatTimeInput(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getTimestampFromDateTimeInput(value) {
  const normalized = String(value || '').trim().replace('T', ' ');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hours, minutes] = match.map(Number);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

function getDateFromDateTimeInput(value) {
  const timestamp = getTimestampFromDateTimeInput(value);
  return timestamp ? new Date(timestamp) : new Date();
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeValue(hours, minutes) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function createPickerButton(text, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className || 'picker-option';
  button.textContent = text;
  return button;
}

function openCustomPicker(input, options = {}) {
  const mode = options.mode || 'datetime';
  const backdrop = document.createElement('div');
  const picker = document.createElement('div');
  const header = document.createElement('div');
  const title = document.createElement('strong');
  const closeButton = document.createElement('button');
  const body = document.createElement('div');
  const actions = document.createElement('div');
  const applyButton = document.createElement('button');
  const cancelButton = document.createElement('button');
  let selectedDate = getDateFromDateTimeInput(input.value);
  let selectedHours = selectedDate.getHours();
  let selectedMinutes = Math.floor(selectedDate.getMinutes() / 5) * 5;
  let visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

  if (mode === 'time') {
    const timeMinutes = getTimeMinutes(input.value);
    if (timeMinutes !== null) {
      selectedHours = Math.floor(timeMinutes / 60);
      selectedMinutes = timeMinutes % 60;
    }
  }

  backdrop.className = 'picker-backdrop';
  picker.className = 'custom-picker';
  header.className = 'picker-header';
  title.textContent = mode === 'time' ? 'Оберіть час' : 'Оберіть дату і час';
  closeButton.type = 'button';
  closeButton.className = 'picker-close';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Закрити');
  body.className = 'picker-body';
  actions.className = 'picker-actions';
  applyButton.type = 'button';
  applyButton.className = 'small-action save-action';
  applyButton.textContent = 'Обрати';
  cancelButton.type = 'button';
  cancelButton.className = 'small-action';
  cancelButton.textContent = 'Скасувати';

  function close(apply) {
    if (apply) {
      input.value = mode === 'time'
        ? formatTimeValue(selectedHours, selectedMinutes)
        : `${formatDateValue(selectedDate)} ${formatTimeValue(selectedHours, selectedMinutes)}`;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    backdrop.remove();
  }

  function renderTimeGrid() {
    const timeGrid = document.createElement('div');
    const hourList = document.createElement('div');
    const minuteList = document.createElement('div');

    timeGrid.className = 'picker-time-grid';
    hourList.className = 'picker-scroll-list';
    minuteList.className = 'picker-scroll-list';

    for (let hour = 0; hour < 24; hour += 1) {
      const button = createPickerButton(String(hour).padStart(2, '0'));
      button.classList.toggle('selected', hour === selectedHours);
      button.addEventListener('click', () => {
        selectedHours = hour;
        render();
      });
      hourList.append(button);
    }

    for (let minute = 0; minute < 60; minute += 5) {
      const button = createPickerButton(String(minute).padStart(2, '0'));
      button.classList.toggle('selected', minute === selectedMinutes);
      button.addEventListener('click', () => {
        selectedMinutes = minute;
        render();
      });
      minuteList.append(button);
    }

    timeGrid.append(hourList, minuteList);
    return timeGrid;
  }

  function renderCalendarPicker() {
    const calendar = document.createElement('div');
    const monthHeader = document.createElement('div');
    const prevButton = createPickerButton('‹', 'calendar-nav');
    const nextButton = createPickerButton('›', 'calendar-nav');
    const monthTitle = document.createElement('strong');
    const weekdays = document.createElement('div');
    const grid = document.createElement('div');
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startOffset);

    calendar.className = 'picker-calendar';
    monthHeader.className = 'picker-month-header';
    monthTitle.textContent = formatMonth(visibleMonth);
    weekdays.className = 'picker-weekdays';
    grid.className = 'picker-calendar-grid';

    prevButton.addEventListener('click', () => {
      visibleMonth = new Date(year, month - 1, 1);
      render();
    });
    nextButton.addEventListener('click', () => {
      visibleMonth = new Date(year, month + 1, 1);
      render();
    });

    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].forEach((day) => {
      const item = document.createElement('span');
      item.textContent = day;
      weekdays.append(item);
    });

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const button = createPickerButton(String(date.getDate()), 'picker-day');
      button.classList.toggle('outside', date.getMonth() !== month);
      button.classList.toggle('selected', getDateKey(date) === getDateKey(selectedDate));
      button.addEventListener('click', () => {
        selectedDate = new Date(date);
        selectedDate.setHours(selectedHours, selectedMinutes, 0, 0);
        visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        render();
      });
      grid.append(button);
    }

    monthHeader.append(prevButton, monthTitle, nextButton);
    calendar.append(monthHeader, weekdays, grid);
    return calendar;
  }

  function render() {
    body.innerHTML = '';
    if (mode === 'datetime') {
      body.append(renderCalendarPicker());
    }
    body.append(renderTimeGrid());
  }

  closeButton.addEventListener('click', () => close(false));
  cancelButton.addEventListener('click', () => close(false));
  applyButton.addEventListener('click', () => close(true));
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close(false);
  });

  header.append(title, closeButton);
  actions.append(cancelButton, applyButton);
  picker.append(header, body, actions);
  backdrop.append(picker);
  document.body.append(backdrop);
  render();
}

function setupPickerInput(input, mode) {
  input.readOnly = true;
  input.inputMode = 'none';
  input.classList.add('picker-input');
  input.setAttribute('aria-haspopup', 'dialog');
  input.addEventListener('click', () => openCustomPicker(input, { mode }));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openCustomPicker(input, { mode });
    }
  });
}

function getTimeMinutes(value) {
  if (!value || typeof value !== 'string') return null;

  const [hours, minutes] = value.split(':').map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function normalizeRateMultiplier(value) {
  const multiplier = Number(value);
  return multiplier === 1.5 || multiplier === 2 ? multiplier : 1;
}

function hasValidRateMultiplier(shift) {
  if (shift.rateMultiplier === undefined && shift.doubleRate === undefined) return true;
  if (shift.rateMultiplier !== undefined) {
    const multiplier = Number(shift.rateMultiplier);
    return multiplier === 1 || multiplier === 1.5 || multiplier === 2;
  }
  return typeof shift.doubleRate === 'boolean';
}

function isValidTimestamp(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function normalizeShiftType(value, fallbackTimestamp = Date.now()) {
  return value === '1 зміна' || value === '2 зміна' ? value : detectShiftType(fallbackTimestamp);
}

function normalizeShiftValue(shift, index = 0, options = {}) {
  if (!shift || typeof shift !== 'object') return null;

  const startedAt = Number(shift.startedAt);
  const endedAt = Number(shift.endedAt);
  const rawRate = Number(shift.rate);
  const rate = Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : 0;
  const rateMultiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));

  if (
    !isValidTimestamp(startedAt) ||
    !isValidTimestamp(endedAt) ||
    endedAt < startedAt ||
    (options.strict && (!Number.isFinite(rawRate) || rawRate < 0)) ||
    !hasValidRateMultiplier(shift)
  ) {
    return null;
  }

  return {
    ...shift,
    id: String(shift.id || `${startedAt}-${endedAt}-${index}`),
    startedAt,
    endedAt,
    rate,
    shiftType: normalizeShiftType(shift.shiftType, startedAt),
    rateMultiplier,
    doubleRate: rateMultiplier === 2
  };
}

function getDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTimestampFromDateKey(dateKey, endOfDay = false) {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date.getTime();
}

function isShiftInDateRange(shift, startKey, endKey) {
  if (!startKey || !endKey) return true;

  const start = getTimestampFromDateKey(startKey);
  const end = getTimestampFromDateKey(endKey, true);
  return start !== null && end !== null && shift.startedAt >= start && shift.startedAt <= end;
}

function getMinutesFromDayStart(timestamp) {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

function detectShiftType(timestamp) {
  const minutes = getMinutesFromDayStart(timestamp);
  const firstShiftEnd = 14 * 60 + 30;
  const secondShiftEnd = 22 * 60 + 30;

  if (minutes < firstShiftEnd) {
    return '1 зміна';
  }

  if (minutes >= firstShiftEnd && minutes < secondShiftEnd) {
    return '2 зміна';
  }

  return 'Поза графіком';
}

function getShiftWindow(timestamp) {
  const date = new Date(timestamp);
  const shiftType = detectShiftType(timestamp);
  const start = new Date(date);
  const end = new Date(date);

  if (shiftType === '1 зміна') {
    start.setHours(6, 30, 0, 0);
    end.setHours(14, 30, 0, 0);
    return { start: start.getTime(), end: end.getTime(), shiftType };
  }

  if (shiftType === '2 зміна') {
    start.setHours(14, 30, 0, 0);
    end.setHours(22, 30, 0, 0);
    return { start: start.getTime(), end: end.getTime(), shiftType };
  }

  return { start: timestamp, end: timestamp, shiftType };
}

function formatMoney(value) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH'
  }).format(value);
}

function formatRate(value) {
  const rate = Number(value) || 0;
  return `${new Intl.NumberFormat('uk-UA', {
    maximumFractionDigits: 2
  }).format(rate)} грн/год`;
}

function calculatePayBreakdown(shift) {
  const rate = Number(shift.rate) || 0;
  const totalMs = Math.max(0, shift.endedAt - shift.startedAt);
  const rateMultiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));

  if (rateMultiplier !== 1) {
    return {
      baseMs: 0,
      overtimeMs: 0,
      multiplierMs: totalMs,
      rateMultiplier,
      total: totalMs / 3600000 * rate * rateMultiplier
    };
  }

  const window = getShiftWindow(shift.startedAt);
  const baseMs = Math.max(0, Math.min(shift.endedAt, window.end) - Math.max(shift.startedAt, window.start));
  const overtimeMs = Math.max(0, totalMs - baseMs);

  return {
    baseMs,
    overtimeMs,
    multiplierMs: 0,
    rateMultiplier: 1,
    total: baseMs / 3600000 * rate + overtimeMs / 3600000 * rate * 1.5
  };
}

function calculatePay(shift) {
  return calculatePayBreakdown(shift).total;
}

function calculateLivePay(startedAt, rate, rateMultiplier) {
  if (!startedAt) return 0;
  return calculatePay({
    startedAt,
    endedAt: Date.now(),
    rate,
    rateMultiplier
  });
}

function getDayProgressFromStart(startedAt, endedAt = Date.now()) {
  return Math.min(1, Math.max(0, endedAt - startedAt) / (24 * 60 * 60 * 1000));
}

function setSvgRingProgress(root, name, progress) {
  const ring = root.querySelector(`[data-ring="${name}"]`);
  if (!ring) return;

  const normalized = Math.min(1, Math.max(0, Number(progress) || 0));
  const visibleProgress = normalized >= 0.003 ? normalized : 0;
  const progressCircle = ring.querySelector('.ring-progress');

  if (progressCircle) {
    progressCircle.style.strokeDasharray = `${visibleProgress * 100} 100`;
    progressCircle.style.strokeDashoffset = '0';
  }

  ring.classList.toggle('has-progress', visibleProgress > 0);
}

function formatPayDetails(shift) {
  const breakdown = calculatePayBreakdown(shift);
  const parts = [];

  if (breakdown.rateMultiplier !== 1) {
    parts.push(`x${breakdown.rateMultiplier}: ${formatDuration(breakdown.multiplierMs)}`);
  } else {
    parts.push(`основна: ${formatDuration(breakdown.baseMs)}`);
    if (breakdown.overtimeMs > 0) {
      parts.push(`перепрацювання x1.5: ${formatDuration(breakdown.overtimeMs)}`);
    }
  }

  return parts.join(' · ');
}

function getShiftCopyText(shift, surname) {
  const period = `${formatTimeOnly(shift.startedAt)}-${formatTimeOnly(shift.endedAt)}`;
  return [String(surname || '').trim(), period].filter(Boolean).join(' ');
}

function renderBottomNav() {
  const host = document.getElementById('bottomNav');
  if (!host) return;

  const currentPage = (location.pathname.split('/').pop() || 'index.html').replace(/[?#].*$/, '') || 'index.html';
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Головне меню');

  navItems.forEach((item) => {
    const link = document.createElement('a');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    link.href = item.href;
    link.setAttribute('aria-label', item.label);
    link.title = item.label;
    if (item.href === currentPage) {
      link.className = 'active';
      link.setAttribute('aria-current', 'page');
    }

    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = item.icon;
    link.append(icon);
    nav.append(link);
  });

  host.replaceChildren(nav);
}

function getToastRoot() {
  let root = document.getElementById('toastRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toastRoot';
    root.className = 'toast-root';
    document.body.append(root);
  }
  return root;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  getToastRoot().append(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function confirmAction(message) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    const modal = document.createElement('div');
    const text = document.createElement('p');
    const actions = document.createElement('div');
    const cancelButton = document.createElement('button');
    const confirmButton = document.createElement('button');

    backdrop.className = 'modal-backdrop';
    modal.className = 'confirm-modal';
    text.textContent = message;
    actions.className = 'edit-actions';
    cancelButton.className = 'small-action';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Скасувати';
    confirmButton.className = 'small-action danger-action';
    confirmButton.type = 'button';
    confirmButton.textContent = 'Підтвердити';

    function close(result) {
      backdrop.remove();
      resolve(result);
    }

    cancelButton.addEventListener('click', () => close(false));
    confirmButton.addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) close(false);
    });

    actions.append(cancelButton, confirmButton);
    modal.append(text, actions);
    backdrop.append(modal);
    document.body.append(backdrop);
    cancelButton.focus();
  });
}

function copyText(text, successMessage = 'Скопійовано') {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) {
    showToast('Немає даних для копіювання', 'error');
    return Promise.resolve(false);
  }

  if (!navigator.clipboard?.writeText) {
    console.info('Clipboard недоступний:', normalizedText);
    showToast('Не вдалося скопіювати', 'error');
    return Promise.resolve(false);
  }

  return navigator.clipboard.writeText(normalizedText)
    .then(() => {
      showToast(successMessage, 'success');
      return true;
    })
    .catch(() => {
      console.info('Не вдалося скопіювати:', normalizedText);
      showToast('Не вдалося скопіювати', 'error');
      return false;
    });
}

function copyShiftSummary(shift) {
  const text = getShiftCopyText(shift, storage.settings.surname);
  copyText(text, 'Скопійовано');
}

function getReportText(shifts, title) {
  const surname = storage.settings.surname;
  const normalizedShifts = [...shifts].sort((first, second) => first.startedAt - second.startedAt);
  const lines = [];
  const totalMs = normalizedShifts.reduce((sum, shift) => sum + Math.max(0, shift.endedAt - shift.startedAt), 0);
  const totalPay = normalizedShifts.reduce((sum, shift) => sum + calculatePay(shift), 0);

  if (surname) {
    lines.push(surname);
  }
  lines.push(title);
  lines.push('');

  if (normalizedShifts.length === 0) {
    lines.push('Записів немає.');
  } else {
    normalizedShifts.forEach((shift) => {
      const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));
      lines.push(
        [
          formatShiftPeriod(shift.startedAt, shift.endedAt),
          formatHoursMinutes(shift.endedAt - shift.startedAt),
          formatRate(shift.rate),
          `x${multiplier}`,
          formatMoney(calculatePay(shift))
        ].join(' · ')
      );
    });
  }

  lines.push('');
  lines.push(`Години: ${formatHoursMinutes(totalMs)}`);
  lines.push(`Сума: ${formatMoney(totalPay)}`);
  return lines.join('\n');
}

function renderTimer() {
  const elapsed = document.getElementById('elapsed');
  const livePay = document.getElementById('livePay');
  const currentRate = document.getElementById('currentRate');
  const autoShift = document.getElementById('autoShift');
  const timerRing = document.getElementById('timerRing');
  const ringAction = document.getElementById('ringAction');
  const ringHint = document.getElementById('ringHint');
  const ringClock = document.getElementById('ringClock');
  const ringPay = document.getElementById('ringPay');
  if (!elapsed || !timerRing) return;

  const settings = storage.settings;
  const startedAt = storage.startedAt;
  const activeRate = storage.activeRate ?? settings.rate;
  const active = Boolean(startedAt);

  if (currentRate) {
    currentRate.textContent = formatRate(activeRate);
  }
  if (ringClock) {
    ringClock.textContent = formatTimeOnly(Date.now());
  }

  timerRing.classList.toggle('ready', !active);
  timerRing.setAttribute('aria-label', active ? 'Таймер зміни' : 'Таймер');
  if (ringAction) {
    ringAction.textContent = 'Старт';
  }
  if (ringHint) {
    ringHint.textContent = timerRing.classList.contains('holding')
      ? 'Тримайте...'
      : `утримуйте ${active ? settings.endHoldSeconds : settings.startHoldSeconds} с`;
  }
  if (timerRing) {
    timerRing.classList.toggle('active', active);
  }

  if (active) {
    const elapsedMs = Date.now() - startedAt;
    const livePayValue = formatMoney(calculateLivePay(startedAt, activeRate, storage.rateMultiplier));
    elapsed.textContent = formatDuration(elapsedMs);
    if (autoShift) {
      autoShift.textContent = detectShiftType(startedAt);
    }
    if (livePay) {
      livePay.textContent = livePayValue;
    }
    if (ringPay) {
      ringPay.textContent = livePayValue;
    }
    return;
  }

  elapsed.textContent = '00:00:00';
  if (timerRing) {
    setSvgRingProgress(timerRing, 'hold', 0);
  }
  if (livePay) {
    livePay.textContent = formatMoney(0);
  }
  if (ringPay) {
    ringPay.textContent = formatMoney(0);
  }
  if (autoShift) {
    autoShift.textContent = 'Поза графіком';
  }
}

function setupTimerPage() {
  const timerRing = document.getElementById('timerRing');
  if (!timerRing) return;
  let holdStartedAt = null;
  let currentHoldDuration = 0;
  let holdFrame = null;
  let holdTimeout = null;

  function startShift() {
    const settings = storage.settings;
    if (hasShiftOnDate(getDateKey(new Date()))) {
      showToast('За сьогодні вже є зміна', 'error');
      return;
    }
    storage.startedAt = Date.now();
    storage.activeRate = settings.rate;
    storage.rateMultiplier = 1;
    renderTimer();
  }

  function endShift() {
    if (!storage.startedAt) return;
    if (hasShiftOnDate(getDateKey(storage.startedAt))) {
      showToast('За цей день вже є зміна', 'error');
      return;
    }

    const settings = storage.settings;
    const activeRate = storage.activeRate ?? settings.rate;
    const rateMultiplier = storage.rateMultiplier;
    const endedAt = Date.now();
    const shift = {
      id: createShiftId(),
      startedAt: storage.startedAt,
      endedAt,
      rate: activeRate,
      shiftType: detectShiftType(storage.startedAt),
      rateMultiplier,
      doubleRate: rateMultiplier === 2
    };
    const shifts = storage.shifts;

    shifts.unshift(shift);
    storage.shifts = shifts;
    storage.lastShift = shift;
    storage.startedAt = null;
    storage.activeRate = null;
    localStorage.removeItem('activeBreaks');
    storage.rateMultiplier = 1;

    copyShiftSummary(shift);
    renderTimer();
  }

  function cancelHold() {
    if (holdFrame) {
      cancelAnimationFrame(holdFrame);
    }
    if (holdTimeout) {
      clearTimeout(holdTimeout);
    }
    holdStartedAt = null;
    currentHoldDuration = 0;
    holdFrame = null;
    holdTimeout = null;
    timerRing.classList.remove('holding', 'hold-start', 'hold-end');
    setSvgRingProgress(timerRing, 'hold', 0);
    renderTimer();
  }

  function renderHoldProgress() {
    if (!holdStartedAt) return;

    const progress = Math.min(1, (Date.now() - holdStartedAt) / currentHoldDuration);
    setSvgRingProgress(timerRing, 'hold', progress);
    holdFrame = requestAnimationFrame(renderHoldProgress);
  }

  function startHold(event) {
    event.preventDefault();
    cancelHold();
    holdStartedAt = Date.now();
    const settings = storage.settings;
    currentHoldDuration = (storage.startedAt ? settings.endHoldSeconds : settings.startHoldSeconds) * 1000;
    timerRing.classList.add('holding', storage.startedAt ? 'hold-end' : 'hold-start');
    const ringHint = document.getElementById('ringHint');
    if (ringHint) {
      ringHint.textContent = 'Тримайте...';
    }
    timerRing.setPointerCapture?.(event.pointerId);
    renderHoldProgress();
    holdTimeout = setTimeout(() => {
      cancelHold();
      if (storage.startedAt) {
        endShift();
      } else {
        startShift();
      }
    }, currentHoldDuration);
  }

  timerRing.addEventListener('pointerdown', startHold);
  timerRing.addEventListener('pointerup', cancelHold);
  timerRing.addEventListener('pointercancel', cancelHold);
  timerRing.addEventListener('pointerleave', cancelHold);
  renderTimer();
  setInterval(renderTimer, 1000);
}

const calendarState = {
  visibleMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDateKey: null,
  rangeStartKey: null,
  rangeEndKey: null,
  editingShiftId: null,
  creatingShift: false,
  filter: 'all'
};

const salaryState = {
  visibleMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDateKey: getDateKey(new Date()),
  rangeStartKey: null,
  rangeEndKey: null
};

const analyticsState = {
  visibleMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  rangeStartKey: null,
  rangeEndKey: null
};

function getRangeKeys(state) {
  if (!state.rangeStartKey || !state.rangeEndKey) return null;
  return state.rangeStartKey <= state.rangeEndKey
    ? { startKey: state.rangeStartKey, endKey: state.rangeEndKey }
    : { startKey: state.rangeEndKey, endKey: state.rangeStartKey };
}

function setRangeDate(state, dateKey) {
  if (!state.rangeStartKey || state.rangeEndKey) {
    state.rangeStartKey = dateKey;
    state.rangeEndKey = null;
    return;
  }

  if (dateKey < state.rangeStartKey) {
    state.rangeEndKey = state.rangeStartKey;
    state.rangeStartKey = dateKey;
    return;
  }

  state.rangeEndKey = dateKey;
}

function clearRange(state) {
  state.rangeStartKey = null;
  state.rangeEndKey = null;
}

function getRangeLabel(state) {
  const range = getRangeKeys(state);
  if (!range) return '';

  const start = formatDateOnly(getTimestampFromDateKey(range.startKey));
  const end = formatDateOnly(getTimestampFromDateKey(range.endKey));
  return range.startKey === range.endKey ? start : `${start} - ${end}`;
}

function applyCalendarDayRangeClasses(button, dateKey, state) {
  const range = getRangeKeys(state);

  if (!range) {
    button.classList.toggle('range-edge', dateKey === state.rangeStartKey);
    return;
  }

  const inRange = dateKey >= range.startKey && dateKey <= range.endKey;
  button.classList.toggle('in-range', inRange);
  button.classList.toggle('range-edge', dateKey === range.startKey || dateKey === range.endKey);
}

function filterShiftsByRange(shifts, state) {
  const range = getRangeKeys(state);
  if (!range) return shifts;
  return shifts.filter((shift) => isShiftInDateRange(shift, range.startKey, range.endKey));
}

function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  const calendarTitle = document.getElementById('calendarTitle');
  if (!calendarGrid || !calendarTitle) return;

  const shifts = storage.shifts;
  const shiftDates = new Set(shifts.map((shift) => getDateKey(shift.startedAt)));
  if (storage.startedAt) {
    shiftDates.add(getDateKey(storage.startedAt));
  }
  const month = calendarState.visibleMonth;
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - startOffset);
  const todayKey = getDateKey(new Date());

  calendarTitle.textContent = formatMonth(month);
  calendarGrid.innerHTML = '';

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    const dateKey = getDateKey(date);
    const button = document.createElement('button');
    button.className = 'calendar-day';
    button.type = 'button';
    button.textContent = String(date.getDate());
    button.setAttribute('aria-label', formatDateOnly(date.getTime()));

    if (date.getMonth() !== monthIndex) {
      button.classList.add('outside');
    }

    if (dateKey === todayKey) {
      button.classList.add('today');
    }

    if (dateKey === calendarState.selectedDateKey) {
      button.classList.add('selected');
    }
    applyCalendarDayRangeClasses(button, dateKey, calendarState);

    if (shiftDates.has(dateKey)) {
      button.classList.add('has-shifts');
    }

    button.addEventListener('click', () => {
      calendarState.selectedDateKey = dateKey;
      setRangeDate(calendarState, dateKey);
      calendarState.visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      calendarState.creatingShift = false;
      renderCalendar();
      renderHistory();
    });

    calendarGrid.append(button);
  }
}

function getActiveHistoryShift() {
  if (!storage.startedAt) return null;

  const settings = storage.settings;
  return {
    id: '__active_shift__',
    active: true,
    startedAt: storage.startedAt,
    endedAt: Date.now(),
    rate: storage.activeRate ?? settings.rate,
    shiftType: detectShiftType(storage.startedAt),
    rateMultiplier: storage.rateMultiplier,
    doubleRate: storage.rateMultiplier === 2
  };
}

function getWeekStart(date = new Date()) {
  const weekStart = new Date(date);
  const offset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - offset);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.getTime();
}

function matchesHistoryFilter(shift) {
  const filter = calendarState.filter;
  const shiftType = shift.shiftType || detectShiftType(shift.startedAt);
  const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));

  if (filter === 'shift-1') return shiftType === '1 зміна';
  if (filter === 'shift-2') return shiftType === '2 зміна';
  if (filter === 'off') return shiftType === 'Поза графіком';
  if (filter === 'x15') return multiplier === 1.5;
  if (filter === 'x2') return multiplier === 2;
  if (filter === 'week') {
    const weekStart = getWeekStart();
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    return shift.startedAt >= weekStart && shift.startedAt < weekEnd;
  }

  return true;
}

function getHistoryFilterLabel() {
  const activeButton = document.querySelector(`#historyFilters [data-filter="${calendarState.filter}"]`);
  return activeButton?.textContent || 'Усі';
}

function renderHistory() {
  const history = document.getElementById('history');
  const emptyHistory = document.getElementById('emptyHistory');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const addShiftBtn = document.getElementById('addShiftBtn');
  const historyTitle = document.getElementById('historyTitle');
  if (!history || !emptyHistory || !clearHistoryBtn) return;

  const shifts = storage.shifts;
  const activeShift = getActiveHistoryShift();
  const allHistoryShifts = activeShift ? [activeShift, ...shifts] : shifts;
  const rangedShifts = filterShiftsByRange(allHistoryShifts, calendarState);
  const dateFilteredShifts = getRangeKeys(calendarState)
    ? rangedShifts
    : calendarState.selectedDateKey
    ? allHistoryShifts.filter((shift) => getDateKey(shift.startedAt) === calendarState.selectedDateKey)
    : allHistoryShifts;
  const filteredShifts = dateFilteredShifts.filter(matchesHistoryFilter);

  history.innerHTML = '';
  emptyHistory.hidden = filteredShifts.length > 0;
  clearHistoryBtn.disabled = shifts.length === 0;
  if (addShiftBtn) {
    addShiftBtn.disabled = calendarState.creatingShift;
  }

  if (historyTitle) {
    const rangeLabel = getRangeLabel(calendarState);
    historyTitle.textContent = rangeLabel
      ? `Зміни за ${rangeLabel}`
      : calendarState.selectedDateKey
      ? `Зміни за ${formatDateOnly(new Date(`${calendarState.selectedDateKey}T00:00:00`).getTime())}`
      : 'Усі зміни';
    if (calendarState.filter !== 'all') {
      historyTitle.textContent += ` · ${getHistoryFilterLabel()}`;
    }
  }

  emptyHistory.textContent = getRangeKeys(calendarState)
    ? 'За цей період і фільтр записів немає.'
    : calendarState.selectedDateKey
    ? 'За цей день і фільтр записів немає.'
    : calendarState.filter === 'all'
      ? 'Історія порожня.'
      : 'За цим фільтром записів немає.';

  filteredShifts.forEach((shift) => {
    const item = document.createElement('li');
    const header = document.createElement('div');
    const titleGroup = document.createElement('div');
    const dateText = document.createElement('span');
    const typeBadge = document.createElement('span');
    const amount = document.createElement('strong');
    const meta = document.createElement('div');
    const timeText = document.createElement('span');
    const durationText = document.createElement('span');
    const rateText = document.createElement('span');
    const actions = document.createElement('div');
    const editButton = document.createElement('button');
    const deleteButton = document.createElement('button');
    const shiftType = shift.shiftType || detectShiftType(shift.startedAt);
    const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));

    item.className = [
      'history-card',
      shiftType === '2 зміна' ? 'shift-second-card' : 'shift-first-card',
      shift.active ? 'active-history-item' : ''
    ].filter(Boolean).join(' ');
    header.className = 'history-card-header';
    titleGroup.className = 'history-title-group';
    dateText.className = 'history-date';
    typeBadge.className = 'history-badge';
    amount.className = 'history-amount';
    meta.className = 'history-meta';
    dateText.textContent = shift.active ? 'Поточна зміна' : formatDateOnly(shift.startedAt);
    typeBadge.textContent = shiftType;
    typeBadge.classList.add(shiftType === '2 зміна' ? 'second-shift' : 'first-shift');
    amount.textContent = formatMoney(calculatePay(shift));
    timeText.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5l3 2"></path><circle cx="12" cy="12" r="9"></circle></svg><span>${shift.active
      ? `${formatTimeOnly(shift.startedAt)} - зараз`
      : `${formatTimeOnly(shift.startedAt)} - ${formatTimeOnly(shift.endedAt)}`}</span>`;
    durationText.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18"></path><path d="M7 8l-4 4 4 4"></path><path d="M17 8l4 4-4 4"></path></svg><span>${formatHoursMinutes(shift.endedAt - shift.startedAt)}</span>`;
    rateText.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"></path></svg><span>${multiplier === 1 ? formatRate(shift.rate) : `${formatRate(shift.rate)} · x${multiplier}`}</span>`;

    actions.className = shift.active ? 'history-actions active-history-actions' : 'history-actions';
    editButton.className = 'small-action';
    editButton.type = 'button';
    editButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';
    editButton.setAttribute('aria-label', 'Редагувати');
    editButton.title = 'Редагувати';
    deleteButton.className = 'small-action danger-action';
    deleteButton.type = 'button';
    deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>';
    deleteButton.setAttribute('aria-label', 'Видалити');
    deleteButton.title = 'Видалити';

    editButton.addEventListener('click', () => {
      calendarState.creatingShift = false;
      calendarState.editingShiftId = shift.id;
      renderHistory();
    });

    deleteButton.hidden = Boolean(shift.active);
    deleteButton.addEventListener('click', async () => {
      if (!(await confirmAction('Видалити цю зміну?'))) return;

      const nextShifts = storage.shifts.filter((savedShift) => savedShift.id !== shift.id);
      storage.shifts = nextShifts;
      storage.lastShift = nextShifts[0] || null;
      if (calendarState.editingShiftId === shift.id) {
        calendarState.editingShiftId = null;
      }
      renderCalendar();
      renderHistory();
      showToast('Зміну видалено', 'success');
    });

    titleGroup.append(dateText, typeBadge);
    header.append(titleGroup, amount);
    meta.append(timeText, durationText, rateText);
    actions.append(editButton, deleteButton);
    item.append(header, meta, actions);

    if (calendarState.editingShiftId === shift.id) {
      item.append(shift.active ? createActiveEditForm(shift) : createEditForm(shift));
    }

    history.append(item);
  });

  if (calendarState.creatingShift) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    const details = document.createElement('span');

    item.className = 'create-history-item';
    title.textContent = 'Нова зміна';
    details.textContent = 'Заповніть час, тип зміни, ставку і коефіцієнт.';
    item.append(title, details, createEditForm(getDefaultNewShift(), { mode: 'create' }));
    history.prepend(item);
    emptyHistory.hidden = true;
  }
}

function getDefaultNewShift() {
  const settings = storage.settings;
  const baseDate = calendarState.selectedDateKey
    ? new Date(`${calendarState.selectedDateKey}T00:00:00`)
    : new Date();
  const startedAt = new Date(baseDate);
  const endedAt = new Date(baseDate);

  startedAt.setHours(6, 30, 0, 0);
  endedAt.setHours(14, 30, 0, 0);

  return {
    id: '__new_shift__',
    startedAt: startedAt.getTime(),
    endedAt: endedAt.getTime(),
    rate: settings.rate,
    shiftType: '1 зміна',
    rateMultiplier: 1,
    doubleRate: false
  };
}

function createActiveEditForm(shift) {
  const form = document.createElement('form');
  const startedLabel = document.createElement('label');
  const rateLabel = document.createElement('label');
  const startedInput = document.createElement('input');
  const rateInput = document.createElement('input');
  const actions = document.createElement('div');
  const saveButton = document.createElement('button');
  const cancelButton = document.createElement('button');
  const formError = document.createElement('p');

  form.className = 'edit-form';
  startedInput.type = 'text';
  startedInput.required = true;
  startedInput.placeholder = '2026-06-14 06:30';
  startedInput.value = formatDateTimeInput(shift.startedAt);
  setupPickerInput(startedInput, 'datetime');
  rateInput.type = 'number';
  rateInput.min = '0';
  rateInput.step = '0.01';
  rateInput.inputMode = 'decimal';
  rateInput.value = Number(shift.rate) || 0;
  actions.className = 'edit-actions';
  formError.className = 'form-error';
  formError.hidden = true;
  saveButton.className = 'small-action save-action';
  saveButton.type = 'submit';
  saveButton.textContent = 'Зберегти';
  cancelButton.className = 'small-action';
  cancelButton.type = 'button';
  cancelButton.textContent = 'Скасувати';

  startedLabel.append('Прихід', startedInput);
  rateLabel.append('Ставка, грн/год', rateInput);

  function showEditError(message) {
    formError.textContent = message;
    formError.hidden = !message;
  }

  cancelButton.addEventListener('click', () => {
    calendarState.editingShiftId = null;
    renderHistory();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nextStartedAt = getTimestampFromDateTimeInput(startedInput.value);
    if (!nextStartedAt || nextStartedAt > Date.now()) {
      showEditError('Перевірте час приходу.');
      return;
    }
    if (hasShiftOnDate(getDateKey(nextStartedAt))) {
      showEditError('За цей день вже є зміна. На один день можна додати тільки одну зміну.');
      return;
    }

    storage.startedAt = nextStartedAt;
    storage.activeRate = Number(rateInput.value) || 0;
    calendarState.editingShiftId = null;
    calendarState.selectedDateKey = getDateKey(nextStartedAt);
    calendarState.visibleMonth = new Date(new Date(nextStartedAt).getFullYear(), new Date(nextStartedAt).getMonth(), 1);
    renderCalendar();
    renderHistory();
    showToast('Поточну зміну оновлено', 'success');
  });

  actions.append(saveButton, cancelButton);
  form.append(startedLabel, rateLabel, formError, actions);
  return form;
}

function createShiftTypeControl(initialValue) {
  const wrapper = document.createElement('div');
  const title = document.createElement('span');
  const options = document.createElement('div');
  const inputs = [];
  const selectedValue = normalizeShiftType(initialValue);
  const inputName = `shiftType-${createShiftId()}`;

  wrapper.className = 'shift-type-control';
  title.textContent = 'Тип зміни';
  options.className = 'segmented-control';

  ['1 зміна', '2 зміна'].forEach((label, index) => {
    const option = document.createElement('label');
    const input = document.createElement('input');
    const text = document.createElement('span');

    input.type = 'radio';
    input.name = inputName;
    input.value = label;
    input.checked = label === selectedValue || (!selectedValue && index === 0);
    text.textContent = label;
    option.append(input, text);
    options.append(option);
    inputs.push(input);
  });

  wrapper.append(title, options);

  return {
    element: wrapper,
    get value() {
      return inputs.find((input) => input.checked)?.value || '1 зміна';
    }
  };
}

function hasShiftOnDate(dateKey, ignoredShiftId = null) {
  return storage.shifts.some((savedShift) => {
    return savedShift.id !== ignoredShiftId && getDateKey(savedShift.startedAt) === dateKey;
  });
}

function createEditForm(shift, options = {}) {
  const mode = options.mode || 'edit';
  const isCreateMode = mode === 'create';
  const form = document.createElement('form');
  const startedLabel = document.createElement('label');
  const endedLabel = document.createElement('label');
  const shiftTypeControl = createShiftTypeControl(shift.shiftType || detectShiftType(shift.startedAt));
  const rateLabel = document.createElement('label');
  const rate15Label = document.createElement('label');
  const doubleRateLabel = document.createElement('label');
  const startedInput = document.createElement('input');
  const endedInput = document.createElement('input');
  const rateInput = document.createElement('input');
  const rate15Input = document.createElement('input');
  const doubleRateInput = document.createElement('input');
  const actions = document.createElement('div');
  const saveButton = document.createElement('button');
  const cancelButton = document.createElement('button');
  const formError = document.createElement('p');
  const rateMultiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));

  form.className = 'edit-form';
  startedInput.type = 'text';
  startedInput.required = true;
  startedInput.placeholder = '2026-06-14 06:30';
  startedInput.value = formatDateTimeInput(shift.startedAt);
  endedInput.type = 'text';
  endedInput.required = true;
  endedInput.placeholder = '2026-06-14 14:30';
  endedInput.value = formatDateTimeInput(shift.endedAt);
  setupPickerInput(startedInput, 'datetime');
  setupPickerInput(endedInput, 'datetime');
  rateInput.type = 'number';
  rateInput.min = '0';
  rateInput.step = '0.01';
  rateInput.inputMode = 'decimal';
  rateInput.value = Number(shift.rate) || 0;
  rate15Input.type = 'checkbox';
  rate15Input.checked = rateMultiplier === 1.5;
  doubleRateInput.type = 'checkbox';
  doubleRateInput.checked = rateMultiplier === 2;

  startedLabel.append('Прихід', startedInput);
  endedLabel.append('Вихід', endedInput);
  rateLabel.append('Ставка, грн/год', rateInput);
  rate15Label.className = 'checkbox-row';
  rate15Label.append(rate15Input, 'Коефіцієнт x1.5');
  doubleRateLabel.className = 'checkbox-row';
  doubleRateLabel.append(doubleRateInput, 'Коефіцієнт x2');

  actions.className = 'edit-actions';
  formError.className = 'form-error';
  formError.hidden = true;
  saveButton.className = 'small-action save-action';
  saveButton.type = 'submit';
  saveButton.textContent = isCreateMode ? 'Створити' : 'Зберегти';
  cancelButton.className = 'small-action';
  cancelButton.type = 'button';
  cancelButton.textContent = 'Скасувати';

  cancelButton.addEventListener('click', () => {
    if (isCreateMode) {
      calendarState.creatingShift = false;
    } else {
      calendarState.editingShiftId = null;
    }
    renderHistory();
  });

  function showEditError(message) {
    formError.textContent = message;
    formError.hidden = !message;
  }

  rate15Input.addEventListener('change', () => {
    if (rate15Input.checked) {
      doubleRateInput.checked = false;
    }
  });

  doubleRateInput.addEventListener('change', () => {
    if (doubleRateInput.checked) {
      rate15Input.checked = false;
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const startedAt = getTimestampFromDateTimeInput(startedInput.value);
    const endedAt = getTimestampFromDateTimeInput(endedInput.value);

    if (!startedAt || !endedAt || endedAt < startedAt) {
      showEditError('Перевірте час приходу та виходу.');
      return;
    }

    if (hasShiftOnDate(getDateKey(startedAt), isCreateMode ? null : shift.id)) {
      showEditError('За цей день вже є зміна. На один день можна додати тільки одну зміну.');
      return;
    }

    const nextRateMultiplier = doubleRateInput.checked ? 2 : (rate15Input.checked ? 1.5 : 1);

    const nextShift = {
      ...shift,
      id: isCreateMode ? createShiftId() : shift.id,
      startedAt,
      endedAt,
      rate: Number(rateInput.value) || 0,
      shiftType: shiftTypeControl.value,
      rateMultiplier: nextRateMultiplier,
      doubleRate: nextRateMultiplier === 2
    };
    const nextShifts = (isCreateMode
      ? [nextShift, ...storage.shifts]
      : storage.shifts.map((savedShift) => savedShift.id === shift.id ? nextShift : savedShift)
    ).sort((firstShift, secondShift) => secondShift.startedAt - firstShift.startedAt);

    storage.shifts = nextShifts;
    storage.lastShift = nextShifts[0] || null;
    calendarState.editingShiftId = null;
    calendarState.creatingShift = false;
    calendarState.selectedDateKey = getDateKey(startedAt);
    calendarState.visibleMonth = new Date(new Date(startedAt).getFullYear(), new Date(startedAt).getMonth(), 1);
    renderCalendar();
    renderHistory();
    showToast(isCreateMode ? 'Зміну створено' : 'Зміну збережено', 'success');
  });

  actions.append(saveButton, cancelButton);
  form.append(startedLabel, endedLabel, shiftTypeControl.element, rateLabel, rate15Label, doubleRateLabel, formError, actions);
  return form;
}

function setupHistoryPage() {
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const addShiftBtn = document.getElementById('addShiftBtn');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const todayBtn = document.getElementById('todayBtn');
  const showAllBtn = document.getElementById('showAllBtn');
  const historyFilters = document.getElementById('historyFilters');
  if (!clearHistoryBtn) return;

  addShiftBtn?.addEventListener('click', () => {
    calendarState.creatingShift = true;
    calendarState.editingShiftId = null;
    renderHistory();
  });

  clearHistoryBtn.addEventListener('click', async () => {
    if (!(await confirmAction('Очистити всю історію?'))) return;

    storage.shifts = [];
    storage.lastShift = null;
    calendarState.selectedDateKey = null;
    clearRange(calendarState);
    calendarState.creatingShift = false;
    calendarState.editingShiftId = null;
    renderCalendar();
    renderHistory();
    showToast('Історію очищено', 'success');
  });

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      calendarState.visibleMonth = new Date(
        calendarState.visibleMonth.getFullYear(),
        calendarState.visibleMonth.getMonth() - 1,
        1
      );
      calendarState.creatingShift = false;
      renderCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      calendarState.visibleMonth = new Date(
        calendarState.visibleMonth.getFullYear(),
        calendarState.visibleMonth.getMonth() + 1,
        1
      );
      calendarState.creatingShift = false;
      renderCalendar();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const today = new Date();
      calendarState.selectedDateKey = getDateKey(today);
      calendarState.rangeStartKey = calendarState.selectedDateKey;
      calendarState.rangeEndKey = calendarState.selectedDateKey;
      calendarState.visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      calendarState.creatingShift = false;
      renderCalendar();
      renderHistory();
    });
  }

  if (showAllBtn) {
    showAllBtn.addEventListener('click', () => {
      calendarState.selectedDateKey = null;
      clearRange(calendarState);
      calendarState.creatingShift = false;
      renderCalendar();
      renderHistory();
    });
  }

  historyFilters?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;

    calendarState.filter = button.dataset.filter || 'all';
    historyFilters.querySelectorAll('[data-filter]').forEach((filterButton) => {
      filterButton.classList.toggle('active', filterButton === button);
    });
    renderHistory();
  });

  renderCalendar();
  renderHistory();
  setInterval(() => {
    if (storage.startedAt && !calendarState.editingShiftId) {
      renderHistory();
    }
  }, 1000);
}

function getMonthShifts(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  return storage.shifts.filter((shift) => {
    const startedAt = new Date(shift.startedAt);
    return startedAt.getFullYear() === year && startedAt.getMonth() === month;
  });
}

function renderSalaryCalendar() {
  const calendarGrid = document.getElementById('salaryCalendarGrid');
  const calendarTitle = document.getElementById('salaryCalendarTitle');
  const monthTotal = document.getElementById('salaryMonthTotal');
  if (!calendarGrid || !calendarTitle || !monthTotal) return;

  const month = salaryState.visibleMonth;
  const range = getRangeKeys(salaryState);
  const monthShifts = range ? filterShiftsByRange(storage.shifts, salaryState) : getMonthShifts(month);
  const shiftDates = new Set();

  monthShifts.forEach((shift) => {
    shiftDates.add(getDateKey(shift.startedAt));
  });

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - startOffset);
  const todayKey = getDateKey(new Date());

  calendarTitle.textContent = formatMonth(month);
  monthTotal.textContent = formatMoney(monthShifts.reduce((total, shift) => total + calculatePay(shift), 0));
  calendarGrid.innerHTML = '';

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    const dateKey = getDateKey(date);
    const button = document.createElement('button');
    button.className = 'calendar-day salary-day';
    button.type = 'button';
    button.setAttribute('aria-label', formatDateOnly(date.getTime()));

    const dayNumber = document.createElement('span');
    dayNumber.textContent = String(date.getDate());
    button.append(dayNumber);

    if (shiftDates.has(dateKey)) {
      button.classList.add('has-shifts');
    }

    if (date.getMonth() !== monthIndex) {
      button.classList.add('outside');
    }

    if (dateKey === todayKey) {
      button.classList.add('today');
    }

    if (dateKey === salaryState.selectedDateKey) {
      button.classList.add('selected');
    }
    applyCalendarDayRangeClasses(button, dateKey, salaryState);

    button.addEventListener('click', () => {
      salaryState.selectedDateKey = dateKey;
      setRangeDate(salaryState, dateKey);
      salaryState.visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      renderSalaryCalendar();
      renderSalaryList();
    });

    calendarGrid.append(button);
  }
}

function renderSalaryList() {
  const dayTotal = document.getElementById('salaryDayTotal');
  const salaryList = document.getElementById('salaryList');
  const salaryEmpty = document.getElementById('salaryEmpty');
  const salaryListTitle = document.getElementById('salaryListTitle');
  if (!dayTotal || !salaryList || !salaryEmpty || !salaryListTitle) return;

  const range = getRangeKeys(salaryState);
  const dayShifts = range
    ? filterShiftsByRange(storage.shifts, salaryState)
    : salaryState.selectedDateKey
    ? storage.shifts.filter((shift) => getDateKey(shift.startedAt) === salaryState.selectedDateKey)
    : getMonthShifts(salaryState.visibleMonth);
  const total = dayShifts.reduce((sum, shift) => sum + calculatePay(shift), 0);

  dayTotal.textContent = formatMoney(total);
  salaryListTitle.textContent = range
    ? `Зміни за ${getRangeLabel(salaryState)}`
    : salaryState.selectedDateKey
    ? `Зміни за ${formatDateOnly(new Date(`${salaryState.selectedDateKey}T00:00:00`).getTime())}`
    : 'Зміни за місяць';
  salaryEmpty.hidden = dayShifts.length > 0;
  salaryEmpty.textContent = range
    ? 'За цей період записів немає.'
    : salaryState.selectedDateKey
    ? 'За цей день записів немає.'
    : 'За цей місяць записів немає.';
  salaryList.innerHTML = '';

  dayShifts.forEach((shift) => {
    const item = document.createElement('li');
    const header = document.createElement('div');
    const titleGroup = document.createElement('div');
    const dateText = document.createElement('span');
    const typeBadge = document.createElement('span');
    const amount = document.createElement('strong');
    const meta = document.createElement('div');
    const timeText = document.createElement('span');
    const durationText = document.createElement('span');
    const rateText = document.createElement('span');
    const shiftType = shift.shiftType || detectShiftType(shift.startedAt);
    const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));

    item.className = [
      'history-card',
      'salary-history-card',
      shiftType === '2 зміна' ? 'shift-second-card' : 'shift-first-card'
    ].join(' ');
    header.className = 'history-card-header';
    titleGroup.className = 'history-title-group';
    dateText.className = 'history-date';
    typeBadge.className = 'history-badge';
    amount.className = 'history-amount';
    meta.className = 'history-meta';

    dateText.textContent = formatDateOnly(shift.startedAt);
    typeBadge.textContent = shiftType;
    typeBadge.classList.add(shiftType === '2 зміна' ? 'second-shift' : 'first-shift');
    amount.textContent = formatMoney(calculatePay(shift));
    timeText.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5l3 2"></path><circle cx="12" cy="12" r="9"></circle></svg><span>${formatTimeOnly(shift.startedAt)} - ${formatTimeOnly(shift.endedAt)}</span>`;
    durationText.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18"></path><path d="M7 8l-4 4 4 4"></path><path d="M17 8l4 4-4 4"></path></svg><span>${formatHoursMinutes(shift.endedAt - shift.startedAt)}</span>`;
    rateText.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"></path></svg><span>${multiplier === 1 ? formatRate(shift.rate) : `${formatRate(shift.rate)} · x${multiplier}`}</span>`;

    titleGroup.append(dateText, typeBadge);
    header.append(titleGroup, amount);
    meta.append(timeText, durationText, rateText);
    item.append(header, meta);
    salaryList.append(item);
  });
}

function setupSalaryPage() {
  const prevMonthBtn = document.getElementById('salaryPrevMonthBtn');
  const nextMonthBtn = document.getElementById('salaryNextMonthBtn');
  const todayBtn = document.getElementById('salaryTodayBtn');
  const monthBtn = document.getElementById('salaryMonthBtn');
  const resetRangeBtn = document.getElementById('salaryResetRangeBtn');
  const copyDayReportBtn = document.getElementById('copyDayReportBtn');
  const copyMonthReportBtn = document.getElementById('copyMonthReportBtn');
  if (!prevMonthBtn || !nextMonthBtn || !todayBtn || !monthBtn) return;

  prevMonthBtn.addEventListener('click', () => {
    salaryState.visibleMonth = new Date(
      salaryState.visibleMonth.getFullYear(),
      salaryState.visibleMonth.getMonth() - 1,
      1
    );
    renderSalaryCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    salaryState.visibleMonth = new Date(
      salaryState.visibleMonth.getFullYear(),
      salaryState.visibleMonth.getMonth() + 1,
      1
    );
    renderSalaryCalendar();
  });

  todayBtn.addEventListener('click', () => {
    const today = new Date();
    salaryState.selectedDateKey = getDateKey(today);
    salaryState.rangeStartKey = salaryState.selectedDateKey;
    salaryState.rangeEndKey = salaryState.selectedDateKey;
    salaryState.visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    renderSalaryCalendar();
    renderSalaryList();
  });

  monthBtn.addEventListener('click', () => {
    salaryState.selectedDateKey = null;
    clearRange(salaryState);
    renderSalaryCalendar();
    renderSalaryList();
  });

  resetRangeBtn?.addEventListener('click', () => {
    salaryState.selectedDateKey = null;
    clearRange(salaryState);
    renderSalaryCalendar();
    renderSalaryList();
  });

  copyDayReportBtn?.addEventListener('click', () => {
    const range = getRangeKeys(salaryState);
    if (!salaryState.selectedDateKey && !range) {
      showToast('Оберіть день у календарі', 'info');
      return;
    }

    const dayShifts = range
      ? filterShiftsByRange(storage.shifts, salaryState)
      : storage.shifts.filter((shift) => getDateKey(shift.startedAt) === salaryState.selectedDateKey);
    const title = range
      ? `Звіт за ${getRangeLabel(salaryState)}`
      : `Звіт за ${formatDateOnly(new Date(`${salaryState.selectedDateKey}T00:00:00`).getTime())}`;
    copyText(getReportText(dayShifts, title), range ? 'Звіт періоду скопійовано' : 'Звіт дня скопійовано');
  });

  copyMonthReportBtn?.addEventListener('click', () => {
    const range = getRangeKeys(salaryState);
    const monthShifts = range ? filterShiftsByRange(storage.shifts, salaryState) : getMonthShifts(salaryState.visibleMonth);
    copyText(
      getReportText(monthShifts, range ? `Звіт за ${getRangeLabel(salaryState)}` : `Звіт за ${formatMonth(salaryState.visibleMonth)}`),
      range ? 'Звіт періоду скопійовано' : 'Звіт місяця скопійовано'
    );
  });

  renderSalaryCalendar();
  renderSalaryList();
}

function appendAnalyticsItem(list, label, value) {
  if (!list) return;

  const item = document.createElement('li');
  const labelText = document.createElement('span');
  const valueText = document.createElement('strong');

  labelText.textContent = label;
  valueText.textContent = value;
  item.append(labelText, valueText);
  list.append(item);
}

function renderAnalyticsList(list, entries, emptyText) {
  if (!list) return;

  list.innerHTML = '';
  if (entries.length === 0) {
    appendAnalyticsItem(list, emptyText, '0');
    return;
  }

  entries.forEach(([label, value]) => appendAnalyticsItem(list, label, value));
}

function renderAnalyticsCalendar() {
  const calendarGrid = document.getElementById('analyticsCalendarGrid');
  const monthTitle = document.getElementById('analyticsMonthTitle');
  if (!calendarGrid || !monthTitle) return;

  const month = analyticsState.visibleMonth;
  const shiftDates = new Set(getMonthShifts(month).map((shift) => getDateKey(shift.startedAt)));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - startOffset);
  const todayKey = getDateKey(new Date());

  monthTitle.textContent = getRangeLabel(analyticsState) || formatMonth(month);
  calendarGrid.innerHTML = '';

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    const dateKey = getDateKey(date);
    const button = document.createElement('button');
    button.className = 'calendar-day';
    button.type = 'button';
    button.textContent = String(date.getDate());
    button.setAttribute('aria-label', formatDateOnly(date.getTime()));

    if (date.getMonth() !== monthIndex) {
      button.classList.add('outside');
    }
    if (dateKey === todayKey) {
      button.classList.add('today');
    }
    if (shiftDates.has(dateKey)) {
      button.classList.add('has-shifts');
    }
    applyCalendarDayRangeClasses(button, dateKey, analyticsState);

    button.addEventListener('click', () => {
      setRangeDate(analyticsState, dateKey);
      analyticsState.visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      renderAnalyticsCalendar();
      renderAnalytics();
    });

    calendarGrid.append(button);
  }
}

function renderAnalytics() {
  const monthTitle = document.getElementById('analyticsMonthTitle');
  const totalPayEl = document.getElementById('analyticsTotalPay');
  const totalHoursEl = document.getElementById('analyticsTotalHours');
  const shiftCountEl = document.getElementById('analyticsShiftCount');
  const averagePayEl = document.getElementById('analyticsAveragePay');
  const chart = document.getElementById('analyticsChart');
  const empty = document.getElementById('analyticsEmpty');
  const shiftTypesList = document.getElementById('analyticsShiftTypes');
  const multipliersList = document.getElementById('analyticsMultipliers');
  const topDaysList = document.getElementById('analyticsTopDays');
  if (!monthTitle || !totalPayEl || !totalHoursEl || !shiftCountEl || !averagePayEl || !chart) return;

  const month = analyticsState.visibleMonth;
  const range = getRangeKeys(analyticsState);
  const monthShifts = range ? filterShiftsByRange(storage.shifts, analyticsState) : getMonthShifts(month);
  const totalPay = monthShifts.reduce((sum, shift) => sum + calculatePay(shift), 0);
  const totalMs = monthShifts.reduce((sum, shift) => sum + Math.max(0, shift.endedAt - shift.startedAt), 0);
  const averagePay = monthShifts.length > 0 ? totalPay / monthShifts.length : 0;
  const shiftTypes = new Map();
  const multipliers = new Map([
    ['x1', 0],
    ['x1.5', 0],
    ['x2', 0]
  ]);
  const dayStats = new Map();

  monthShifts.forEach((shift) => {
    const shiftType = shift.shiftType || detectShiftType(shift.startedAt);
    const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));
    const dayKey = getDateKey(shift.startedAt);
    const pay = calculatePay(shift);
    const currentDay = dayStats.get(dayKey) || { pay: 0, ms: 0, count: 0, timestamp: shift.startedAt };

    shiftTypes.set(shiftType, (shiftTypes.get(shiftType) || 0) + 1);
    multipliers.set(`x${multiplier}`, (multipliers.get(`x${multiplier}`) || 0) + 1);
    dayStats.set(dayKey, {
      pay: currentDay.pay + pay,
      ms: currentDay.ms + Math.max(0, shift.endedAt - shift.startedAt),
      count: currentDay.count + 1,
      timestamp: currentDay.timestamp
    });
  });

  monthTitle.textContent = getRangeLabel(analyticsState) || formatMonth(month);
  totalPayEl.textContent = formatMoney(totalPay);
  totalHoursEl.textContent = formatHoursMinutes(totalMs);
  shiftCountEl.textContent = String(monthShifts.length);
  averagePayEl.textContent = formatMoney(averagePay);
  if (empty) {
    empty.hidden = monthShifts.length > 0;
    empty.textContent = range ? 'За цей період записів немає.' : 'За цей місяць записів немає.';
  }

  const maxDayPay = Math.max(1, ...Array.from(dayStats.values()).map((item) => item.pay));
  const chartDates = [];

  if (range) {
    const start = new Date(getTimestampFromDateKey(range.startKey));
    const end = new Date(getTimestampFromDateKey(range.endKey));
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      chartDates.push(new Date(date));
    }
  } else {
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      chartDates.push(new Date(month.getFullYear(), month.getMonth(), day));
    }
  }

  chart.innerHTML = '';
  chartDates.forEach((date) => {
    const dateKey = getDateKey(date);
    const stats = dayStats.get(dateKey);
    const wrapper = document.createElement('div');
    const bar = document.createElement('div');
    const label = document.createElement('span');
    const height = stats ? Math.max(6, Math.round(stats.pay / maxDayPay * 140)) : 3;

    wrapper.className = 'chart-day';
    bar.className = 'chart-bar';
    bar.style.height = `${height}px`;
    bar.title = stats ? `${formatDateOnly(date.getTime())}: ${formatMoney(stats.pay)}` : formatDateOnly(date.getTime());
    label.className = 'chart-label';
    label.textContent = range ? formatShortDate(date.getTime()) : String(date.getDate());
    wrapper.append(bar, label);
    chart.append(wrapper);
  });

  renderAnalyticsList(
    shiftTypesList,
    Array.from(shiftTypes.entries()).sort((first, second) => second[1] - first[1]).map(([label, count]) => [label, String(count)]),
    'Змін немає'
  );
  renderAnalyticsList(
    multipliersList,
    Array.from(multipliers.entries()).map(([label, count]) => [label, String(count)]),
    'Коефіцієнтів немає'
  );
  renderAnalyticsList(
    topDaysList,
    Array.from(dayStats.entries())
      .sort((first, second) => second[1].pay - first[1].pay)
      .slice(0, 3)
      .map(([, stats]) => [formatDateOnly(stats.timestamp), `${formatMoney(stats.pay)} · ${stats.count}`]),
    'Днів немає'
  );
}

function setupAnalyticsPage() {
  const prevMonthBtn = document.getElementById('analyticsPrevMonthBtn');
  const nextMonthBtn = document.getElementById('analyticsNextMonthBtn');
  const todayBtn = document.getElementById('analyticsTodayBtn');
  const monthBtn = document.getElementById('analyticsMonthBtn');
  const resetRangeBtn = document.getElementById('analyticsResetRangeBtn');
  if (!prevMonthBtn || !nextMonthBtn) return;

  prevMonthBtn.addEventListener('click', () => {
    analyticsState.visibleMonth = new Date(
      analyticsState.visibleMonth.getFullYear(),
      analyticsState.visibleMonth.getMonth() - 1,
      1
    );
    renderAnalyticsCalendar();
    renderAnalytics();
  });

  nextMonthBtn.addEventListener('click', () => {
    analyticsState.visibleMonth = new Date(
      analyticsState.visibleMonth.getFullYear(),
      analyticsState.visibleMonth.getMonth() + 1,
      1
    );
    renderAnalyticsCalendar();
    renderAnalytics();
  });

  todayBtn?.addEventListener('click', () => {
    const today = new Date();
    analyticsState.rangeStartKey = getDateKey(today);
    analyticsState.rangeEndKey = getDateKey(today);
    analyticsState.visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    renderAnalyticsCalendar();
    renderAnalytics();
  });

  monthBtn?.addEventListener('click', () => {
    clearRange(analyticsState);
    renderAnalyticsCalendar();
    renderAnalytics();
  });

  resetRangeBtn?.addEventListener('click', () => {
    clearRange(analyticsState);
    renderAnalyticsCalendar();
    renderAnalytics();
  });

  renderAnalyticsCalendar();
  renderAnalytics();
}

function exportBackup() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: storage.settings,
    shifts: storage.shifts,
    lastShift: storage.lastShift
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `shifter-backup-${getDateKey(new Date())}.json`;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
  showToast('JSON експортовано', 'success');
}

function importBackup(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const data = JSON.parse(String(reader.result || '{}'));
      if (!data || typeof data !== 'object' || !Array.isArray(data.shifts)) {
        throw new Error('Invalid backup');
      }

      const normalizedShifts = data.shifts.map((shift, index) => normalizeShiftValue(shift, index, { strict: true }));
      if (normalizedShifts.some((shift) => !shift)) {
        throw new Error('Invalid shifts');
      }

      storage.settings = normalizeSettingsValue(data.settings || {});
      storage.shifts = normalizedShifts.sort((firstShift, secondShift) => secondShift.startedAt - firstShift.startedAt);
      storage.lastShift = storage.shifts[0] || null;
      normalizeSettings();
      normalizeShifts();
      showToast('Дані імпортовано', 'success');
      setTimeout(() => location.reload(), 450);
    } catch {
      showToast('Не вдалося імпортувати JSON', 'error');
    }
  });
  reader.readAsText(file);
}

function setupSettingsPage() {
  const surnameInput = document.getElementById('surnameInput');
  const rateInput = document.getElementById('rateInput');
  const startHoldInput = document.getElementById('startHoldInput');
  const endHoldInput = document.getElementById('endHoldInput');
  const saved = document.getElementById('settingsSaved');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importDataBtn = document.getElementById('importDataBtn');
  const importDataInput = document.getElementById('importDataInput');
  if (!rateInput) return;

  const settings = storage.settings;
  if (surnameInput) {
    surnameInput.value = settings.surname;
  }
  rateInput.value = settings.rate || '';
  if (startHoldInput) {
    startHoldInput.value = settings.startHoldSeconds;
  }
  if (endHoldInput) {
    endHoldInput.value = settings.endHoldSeconds;
  }

  function saveSettings() {
    storage.settings = {
      rate: Number(rateInput.value) || 0,
      startHoldSeconds: clampHoldSeconds(startHoldInput?.value, defaultSettings.startHoldSeconds),
      endHoldSeconds: clampHoldSeconds(endHoldInput?.value, defaultSettings.endHoldSeconds),
      surname: surnameInput?.value || ''
    };

    const nextSettings = storage.settings;
    if (startHoldInput) {
      startHoldInput.value = nextSettings.startHoldSeconds;
    }
    if (endHoldInput) {
      endHoldInput.value = nextSettings.endHoldSeconds;
    }

    if (saved) {
      saved.textContent = 'Збережено автоматично';
    }
  }

  surnameInput?.addEventListener('input', saveSettings);
  rateInput.addEventListener('input', saveSettings);
  startHoldInput?.addEventListener('change', saveSettings);
  endHoldInput?.addEventListener('change', saveSettings);
  exportDataBtn?.addEventListener('click', exportBackup);
  importDataBtn?.addEventListener('click', () => {
    importDataInput?.click();
  });
  importDataInput?.addEventListener('change', () => {
    importBackup(importDataInput.files?.[0]);
    importDataInput.value = '';
  });
}

normalizeSettings();
normalizeShifts();
renderBottomNav();
setupTimerPage();
setupHistoryPage();
setupSalaryPage();
setupAnalyticsPage();
setupSettingsPage();

if ('serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  };

  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker);
  }
}
