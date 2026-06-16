import { normalizeSettingsValue } from '../../entities/settings/model';
import type { Settings } from '../../entities/settings/types';
import { normalizeRateMultiplier, normalizeShiftValue } from '../../entities/shift/model';
import type { RateMultiplier, Shift } from '../../entities/shift/types';

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue === null ? fallback : JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}

export const storage = {
  get settings(): Settings {
    return normalizeSettingsValue(readJsonStorage<Partial<Settings>>('settings', {}));
  },
  set settings(value: Settings) {
    localStorage.setItem('settings', JSON.stringify(value));
  },
  get startedAt(): number | null {
    return Number(localStorage.getItem('startedAt')) || null;
  },
  set startedAt(value: number | null) {
    if (value) localStorage.setItem('startedAt', String(value));
    else localStorage.removeItem('startedAt');
  },
  get activeRate(): number | null {
    const rate = Number(localStorage.getItem('activeRate'));
    return Number.isFinite(rate) && rate >= 0 ? rate : null;
  },
  set activeRate(value: number | null) {
    const rate = Number(value);
    if (Number.isFinite(rate) && rate >= 0) localStorage.setItem('activeRate', String(rate));
    else localStorage.removeItem('activeRate');
  },
  get lastShift(): Shift | null {
    return normalizeShiftValue(readJsonStorage<unknown>('lastShift', null));
  },
  set lastShift(value: Shift | null) {
    if (value) localStorage.setItem('lastShift', JSON.stringify(value));
    else localStorage.removeItem('lastShift');
  },
  get shifts(): Shift[] {
    const shifts = readJsonStorage<unknown>('shifts', []);
    if (!Array.isArray(shifts)) return [];
    return shifts
      .map((shift, index) => normalizeShiftValue(shift, index))
      .filter((shift): shift is Shift => Boolean(shift));
  },
  set shifts(value: Shift[]) {
    localStorage.setItem('shifts', JSON.stringify(value));
  },
  get doubleRate(): boolean {
    return localStorage.getItem('doubleRate') === 'true';
  },
  set doubleRate(value: boolean) {
    localStorage.setItem('doubleRate', String(Boolean(value)));
  },
  get rateMultiplier(): RateMultiplier {
    const value = Number(localStorage.getItem('rateMultiplier'));
    if (value === 1.5 || value === 2) return value;
    return this.doubleRate ? 2 : 1;
  },
  set rateMultiplier(value: RateMultiplier) {
    const multiplier = normalizeRateMultiplier(value);
    localStorage.setItem('rateMultiplier', String(multiplier));
    localStorage.setItem('doubleRate', String(multiplier === 2));
  }
};

export function normalizeStoredData(): void {
  const settings = storage.settings;
  storage.settings = settings;

  if (!storage.startedAt) storage.activeRate = null;

  localStorage.removeItem('activeBreaks');
  localStorage.removeItem('airAlarmStartedAt');
  localStorage.removeItem('airAlarmMs');
  localStorage.removeItem('airAlarmIntervals');

  const sorted = [...storage.shifts].sort((first, second) => second.startedAt - first.startedAt);
  storage.shifts = sorted;
  storage.lastShift = sorted[0] || null;
}
