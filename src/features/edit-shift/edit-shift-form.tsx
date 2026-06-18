import { useMemo, useState } from 'react';
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

function getTimeParts(value: string): { hours: string; minutes: string } {
  const minutesFromDayStart = parseTimeToMinutes(value) ?? 0;
  return {
    hours: String(Math.floor(minutesFromDayStart / 60)).padStart(2, '0'),
    minutes: String(minutesFromDayStart % 60).padStart(2, '0')
  };
}

function setTimePart(value: string, part: 'hours' | 'minutes', nextValue: string): string {
  const current = getTimeParts(value);
  return part === 'hours' ? `${nextValue}:${current.minutes}` : `${current.hours}:${nextValue}`;
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

export function EditShiftForm({ shift, mode = 'edit', onCancel, onSaved }: EditShiftFormProps) {
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
  const [openTimePicker, setOpenTimePicker] = useState<'start' | 'end' | null>(null);
  const [rate, setRate] = useState(String(Number(shift.rate) || 0));
  const [shiftType, setShiftType] = useState<ShiftType>(normalizeShiftType(shift.shiftType, shift.startedAt));
  const [rateMultiplier, setRateMultiplier] = useState<RateMultiplier>(normalizeRateMultiplier(shift.rateMultiplier));
  const [error, setError] = useState('');
  const inputName = useMemo(() => `shiftType-${createShiftId()}`, []);
  const multiplierInputName = useMemo(() => `rateMultiplier-${createShiftId()}`, []);
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')), []);
  const minuteOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0')), []);

  function renderTimePicker(label: string, value: string, picker: 'start' | 'end', onChange: (value: string) => void) {
    const parts = getTimeParts(value);

    return (
      <div className="time-picker-field">
        <span>{label}</span>
        <button
          className="time-picker-button"
          type="button"
          aria-expanded={openTimePicker === picker}
          onClick={() => setOpenTimePicker((current) => (current === picker ? null : picker))}
        >
          {value}
        </button>
        {openTimePicker === picker && (
          <div className="time-picker-panel">
            <div className="time-picker-column" aria-label={`${label}: години`}>
              {hourOptions.map((hour) => (
                <button
                  key={hour}
                  className={`time-option ${parts.hours === hour ? 'selected' : ''}`}
                  type="button"
                  onClick={() => onChange(setTimePart(value, 'hours', hour))}
                >
                  {hour}
                </button>
              ))}
            </div>
            <div className="time-picker-column" aria-label={`${label}: хвилини`}>
              {minuteOptions.map((minutes) => (
                <button
                  key={minutes}
                  className={`time-option ${parts.minutes === minutes ? 'selected' : ''}`}
                  type="button"
                  onClick={() => onChange(setTimePart(value, 'minutes', minutes))}
                >
                  {minutes}
                </button>
              ))}
            </div>
          </div>
        )}
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
            ariaLabel="Календар дати зміни"
            onDateClick={(date, nextDateKey) => {
              setDateKey(nextDateKey);
              setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
            }}
          />
        </div>
      </div>
      <div className="time-grid">
        {renderTimePicker('Прихід', startedTime, 'start', setStartedTime)}
        {!isActive && renderTimePicker('Вихід', endedTime, 'end', setEndedTime)}
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
