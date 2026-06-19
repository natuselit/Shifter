import { useEffect, useMemo, useState } from 'react';
import { storage, useStore } from '@/entities/app-state';
import {
  createShiftId,
  detectShiftType,
  getDateKey,
  hasShiftOnDate,
  normalizeRateMultiplier,
  normalizeShiftType,
  type ActiveShift,
  type RateMultiplier,
  type Shift,
  type ShiftType
} from '@/entities/shift';
import { formatMonth, normalizeNonNegativeNumber } from '@/shared/lib';
import { CalendarGrid, useToast } from '@/shared/ui';

interface EditShiftFormProps {
  shift: Shift | ActiveShift;
  mode?: 'edit' | 'create' | 'active';
  shiftDateKeys?: Set<string>;
  activeDateKey?: string | null;
  onDateSwitch?: (dateKey: string) => boolean;
  onCancel: () => void;
  onSaved: (savedShift: Shift | ActiveShift) => void;
}

export function getDefaultNewShift(selectedDateKey: string | null, rate: number): Shift {
  const baseDate = selectedDateKey ? new Date(`${selectedDateKey}T00:00:00`) : new Date();
  const startedAt = new Date(baseDate);
  const endedAt = new Date(baseDate);

  startedAt.setHours(6, 30, 0, 0);
  endedAt.setHours(14, 30, 0, 0);

  return {
    id: '__new_shift__',
    startedAt: startedAt.getTime(),
    endedAt: endedAt.getTime(),
    rate,
    shiftType: '1 зміна',
    rateMultiplier: 1,
    doubleRate: false
  };
}

export function formatTimeInput(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function parseTimeToMinutes(value: string): number | null {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
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

function clampTimePart(value: string, max: number): string {
  if (value.length < 2) return value;
  return String(Math.min(Number(value), max)).padStart(2, '0');
}

export function formatTimeMaskInput(rawValue: string, previousValue = ''): string {
  const rawText = String(rawValue || '');
  const previousText = String(previousValue || '');
  const digits = String(rawValue || '')
    .replace(/\D/g, '')
    .slice(0, 4);

  if (digits.length <= 1) return digits;

  const hours = clampTimePart(digits.slice(0, 2), 23);
  if (digits.length === 2) {
    const isDeletingSeparator = rawText.length < previousText.length && previousText.endsWith(':');
    return isDeletingSeparator ? hours : `${hours}:`;
  }

  const minutes = digits.length === 4 ? clampTimePart(digits.slice(2), 59) : digits.slice(2);
  return `${hours}:${minutes}`;
}

export function getTimestampFromDateAndTime(dateKey: string, timeValue: string): number | null {
  const [year, month, day] = String(dateKey || '')
    .split('-')
    .map(Number);
  const minutesFromDayStart = parseTimeToMinutes(timeValue);
  if (minutesFromDayStart === null) return null;

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

  date.setHours(Math.floor(minutesFromDayStart / 60), minutesFromDayStart % 60, 0, 0);
  return date.getTime();
}

export function saveActiveShiftValue(
  shift: ActiveShift,
  startedAt: number,
  rateValue: unknown,
  rateMultiplier: RateMultiplier
): ActiveShift {
  const normalizedRate = normalizeNonNegativeNumber(rateValue);
  storage.startedAt = startedAt;
  storage.activeRate = normalizedRate;
  storage.rateMultiplier = rateMultiplier;

  return {
    ...shift,
    startedAt,
    endedAt: Date.now(),
    rate: normalizedRate,
    rateMultiplier,
    doubleRate: rateMultiplier === 2
  };
}

export function EditShiftForm({
  shift,
  mode = 'edit',
  shiftDateKeys,
  activeDateKey,
  onDateSwitch,
  onCancel,
  onSaved
}: EditShiftFormProps) {
  const isActive = mode === 'active';
  const isCreate = mode === 'create';
  const { refresh } = useStore();
  const { showToast } = useToast();
  const [dateKey, setDateKey] = useState(getDateKey(shift.startedAt));
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = new Date(shift.startedAt);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [startedTime, setStartedTime] = useState(formatTimeInput(shift.startedAt));
  const [endedTime, setEndedTime] = useState(formatTimeInput(shift.endedAt));
  const [rate, setRate] = useState(String(Number(shift.rate) || 0));
  const [shiftType, setShiftType] = useState<ShiftType>(normalizeShiftType(shift.shiftType, shift.startedAt));
  const [rateMultiplier, setRateMultiplier] = useState<RateMultiplier>(normalizeRateMultiplier(shift.rateMultiplier));
  const [error, setError] = useState('');
  const inputName = useMemo(() => `shiftType-${createShiftId()}`, []);
  const multiplierInputName = useMemo(() => `rateMultiplier-${createShiftId()}`, []);

  useEffect(() => {
    const nextDate = new Date(shift.startedAt);
    setDateKey(getDateKey(shift.startedAt));
    setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setStartedTime(formatTimeInput(shift.startedAt));
    setEndedTime(formatTimeInput(shift.endedAt));
    setRate(String(Number(shift.rate) || 0));
    setShiftType(normalizeShiftType(shift.shiftType, shift.startedAt));
    setRateMultiplier(normalizeRateMultiplier(shift.rateMultiplier));
    setError('');
  }, [shift.id, shift.startedAt, shift.endedAt, shift.rate, shift.rateMultiplier, shift.shiftType]);

  function renderTimeInput(label: string, value: string, onChange: (value: string) => void) {
    const inputId = `${inputName}-${label}`;

    return (
      <div className="time-picker-field">
        <label htmlFor={inputId}>{label}</label>
        <input
          id={inputId}
          className="time-mask-input"
          value={value}
          inputMode="numeric"
          maxLength={5}
          pattern="[0-9]{1,2}:[0-9]{2}"
          placeholder="06:30"
          onChange={(event) => onChange(formatTimeMaskInput(event.target.value, value))}
          onFocus={(event) => event.currentTarget.select()}
          aria-label={`${label}: час`}
        />
      </div>
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const startedAt = getTimestampFromDateAndTime(dateKey, startedTime);
    const endedAt = isActive ? Date.now() : getTimestampFromDateAndTime(dateKey, endedTime);

    if (!startedAt || !endedAt || endedAt < startedAt || (isActive && startedAt > Date.now())) {
      setError(isActive ? 'Перевірте час приходу.' : 'Перевірте час приходу та виходу.');
      return;
    }

    if (hasShiftOnDate(storage.shifts, getDateKey(startedAt), isCreate || isActive ? null : shift.id)) {
      setError('За цей день вже є зміна. На один день можна додати тільки одну зміну.');
      return;
    }

    if (isActive) {
      const savedShift = saveActiveShiftValue(shift as ActiveShift, startedAt, rate, rateMultiplier);
      refresh();
      showToast('Поточну зміну оновлено', 'success');
      onSaved(savedShift);
      return;
    }

    const normalizedRate = normalizeNonNegativeNumber(rate);
    const nextShift: Shift = {
      id: isCreate ? createShiftId() : shift.id,
      startedAt,
      endedAt,
      rate: normalizedRate,
      shiftType: normalizeShiftType(shiftType || detectShiftType(startedAt), startedAt),
      rateMultiplier,
      doubleRate: rateMultiplier === 2
    };
    const nextShifts = (
      isCreate
        ? [nextShift, ...storage.shifts]
        : storage.shifts.map((savedShift) => (savedShift.id === shift.id ? nextShift : savedShift))
    ).sort((first, second) => second.startedAt - first.startedAt);

    storage.shifts = nextShifts;
    storage.lastShift = nextShifts[0] || null;
    refresh();
    showToast(isCreate ? 'Зміну створено' : 'Зміну збережено', 'success');
    onSaved(nextShift);
  }

  return (
    <form className={`edit-form ${isCreate ? 'create-shift-form' : ''}`} onSubmit={submit}>
      {isCreate && (
        <div className="edit-form-heading">
          <strong>Нова зміна</strong>
          <span>Оберіть день у календарі, часи, ставку і коефіцієнт.</span>
        </div>
      )}
      <div className="shift-date-control">
        <div className="inline-date-picker">
          <div className="calendar-header compact-calendar-header">
            <button
              className="calendar-nav"
              type="button"
              aria-label="Попередній місяць"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <h2>{formatMonth(visibleMonth)}</h2>
            <button
              className="calendar-nav"
              type="button"
              aria-label="Наступний місяць"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>
          <CalendarGrid
            visibleMonth={visibleMonth}
            selectedDateKey={dateKey}
            shiftDateKeys={shiftDateKeys}
            activeDateKey={activeDateKey}
            ariaLabel="Календар дати зміни"
            onDateClick={(date, nextDateKey) => {
              if (onDateSwitch) {
                onDateSwitch(nextDateKey);
                return;
              }

              setDateKey(nextDateKey);
              setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
            }}
          />
        </div>
      </div>
      <div className="time-grid">
        {renderTimeInput('Прихід', startedTime, setStartedTime)}
        {!isActive && renderTimeInput('Вихід', endedTime, setEndedTime)}
      </div>
      {!isActive && (
        <fieldset className="shift-type-control">
          <legend>Тип зміни</legend>
          <div className="segmented-control" role="radiogroup" aria-label="Тип зміни">
            {(['1 зміна', '2 зміна'] as const).map((label) => (
              <label key={label}>
                <input
                  type="radio"
                  name={inputName}
                  value={label}
                  checked={shiftType === label}
                  onChange={() => setShiftType(label)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label>
        Ставка, грн/год
        <input
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          type="number"
          min="0"
          step="0.001"
          inputMode="decimal"
          onWheel={(event) => event.currentTarget.blur()}
        />
      </label>
      <fieldset className="shift-type-control">
        <legend>Коефіцієнт</legend>
        <div className="segmented-control segmented-control-three" role="radiogroup" aria-label="Коефіцієнт">
          {([1, 1.5, 2] as const).map((multiplier) => (
            <label key={multiplier}>
              <input
                type="radio"
                name={multiplierInputName}
                value={multiplier}
                checked={rateMultiplier === multiplier}
                onChange={() => setRateMultiplier(multiplier)}
              />
              <span>x{multiplier}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="form-error" hidden={!error}>
        {error}
      </p>
      <div className="edit-actions">
        <button className="small-action save-action" type="submit">
          {isCreate ? 'Створити' : 'Зберегти'}
        </button>
        <button className="small-action" type="button" onClick={onCancel}>
          Скасувати
        </button>
      </div>
    </form>
  );
}
