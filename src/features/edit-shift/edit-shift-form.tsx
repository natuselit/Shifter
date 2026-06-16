import { useMemo, useState } from 'react';
import {
  createShiftId,
  detectShiftType,
  getDateKey,
  hasShiftOnDate,
  normalizeRateMultiplier,
  normalizeShiftType
} from '../../entities/shift/model';
import type { ActiveShift, RateMultiplier, Shift, ShiftType } from '../../entities/shift/types';
import { formatDateTimeInput, getTimestampFromDateTimeInput } from '../../shared/lib/format';
import { normalizeNonNegativeNumber } from '../../shared/lib/number';
import { storage } from '../../shared/storage/local-storage';
import { useStore } from '../../app/providers/store-provider';
import { useToast } from '../../widgets/toast/toast-provider';

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
  const [startedValue, setStartedValue] = useState(formatDateTimeInput(shift.startedAt));
  const [endedValue, setEndedValue] = useState(formatDateTimeInput(shift.endedAt));
  const [rate, setRate] = useState(String(Number(shift.rate) || 0));
  const [shiftType, setShiftType] = useState<ShiftType>(normalizeShiftType(shift.shiftType, shift.startedAt));
  const [rateMultiplier, setRateMultiplier] = useState<RateMultiplier>(normalizeRateMultiplier(shift.rateMultiplier));
  const [error, setError] = useState('');
  const inputName = useMemo(() => `shiftType-${createShiftId()}`, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const startedAt = getTimestampFromDateTimeInput(startedValue);
    const endedAt = isActive ? Date.now() : getTimestampFromDateTimeInput(endedValue);

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
    <form className="edit-form" onSubmit={submit}>
      <label>
        Прихід
        <input
          value={startedValue}
          onChange={(event) => setStartedValue(event.target.value)}
          type="text"
          required
          placeholder="2026-06-14 06:30"
        />
      </label>
      {!isActive && (
        <label>
          Вихід
          <input
            value={endedValue}
            onChange={(event) => setEndedValue(event.target.value)}
            type="text"
            required
            placeholder="2026-06-14 14:30"
          />
        </label>
      )}
      {!isActive && (
        <div className="shift-type-control">
          <span>Тип зміни</span>
          <div className="segmented-control">
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
        </div>
      )}
      <label>
        Ставка, грн/год
        <input
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
        />
      </label>
      <>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={rateMultiplier === 1.5}
            onChange={(event) => setRateMultiplier(event.target.checked ? 1.5 : 1)}
          />
          Коефіцієнт x1.5
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={rateMultiplier === 2}
            onChange={(event) => setRateMultiplier(event.target.checked ? 2 : 1)}
          />
          Коефіцієнт x2
        </label>
      </>
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
