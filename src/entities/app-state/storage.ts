import { normalizeSettingsValue, type Settings } from '@/entities/settings';
import {
  isValidTimestamp,
  normalizeRateMultiplier,
  normalizeShiftValue,
  type RateMultiplier,
  type Shift
} from '@/entities/shift';
import {
  readJsonStorage,
  readStorageItem,
  removeStorageItem,
  writeJsonStorage,
  writeStorageItem
} from '@/shared/storage';

export const storage = {
  get settings(): Settings {
    return normalizeSettingsValue(readJsonStorage<Partial<Settings>>('settings', {}));
  },
  set settings(value: Settings) {
    writeJsonStorage('settings', value);
  },
  get startedAt(): number | null {
    const value = Number(readStorageItem('startedAt'));
    return isValidTimestamp(value) ? value : null;
  },
  set startedAt(value: number | null) {
    const timestamp = Number(value);
    if (isValidTimestamp(timestamp)) writeStorageItem('startedAt', String(timestamp));
    else removeStorageItem('startedAt');
  },
  get activeRate(): number | null {
    const rawValue = readStorageItem('activeRate');
    if (rawValue === null) return null;
    const rate = Number(rawValue);
    return Number.isFinite(rate) && rate >= 0 ? rate : null;
  },
  set activeRate(value: number | null) {
    if (value === null) {
      removeStorageItem('activeRate');
      return;
    }

    const rate = Number(value);
    if (Number.isFinite(rate) && rate >= 0) writeStorageItem('activeRate', String(rate));
    else removeStorageItem('activeRate');
  },
  get lastShift(): Shift | null {
    return normalizeShiftValue(readJsonStorage<unknown>('lastShift', null));
  },
  set lastShift(value: Shift | null) {
    if (value) writeJsonStorage('lastShift', value);
    else removeStorageItem('lastShift');
  },
  get shifts(): Shift[] {
    const shifts = readJsonStorage<unknown>('shifts', []);
    if (!Array.isArray(shifts)) return [];
    return shifts
      .map((shift, index) => normalizeShiftValue(shift, index))
      .filter((shift): shift is Shift => Boolean(shift));
  },
  set shifts(value: Shift[]) {
    writeJsonStorage('shifts', value);
  },
  get doubleRate(): boolean {
    return readStorageItem('doubleRate') === 'true';
  },
  set doubleRate(value: boolean) {
    writeStorageItem('doubleRate', String(Boolean(value)));
  },
  get rateMultiplier(): RateMultiplier {
    const value = Number(readStorageItem('rateMultiplier'));
    if (value === 1.5 || value === 2) return value;
    return this.doubleRate ? 2 : 1;
  },
  set rateMultiplier(value: RateMultiplier) {
    const multiplier = normalizeRateMultiplier(value);
    writeStorageItem('rateMultiplier', String(multiplier));
    writeStorageItem('doubleRate', String(multiplier === 2));
  }
};

export function normalizeStoredData(): void {
  const settings = storage.settings;
  storage.settings = settings;

  if (!storage.startedAt) storage.activeRate = null;

  removeStorageItem('activeBreaks');
  removeStorageItem('airAlarmStartedAt');
  removeStorageItem('airAlarmMs');
  removeStorageItem('airAlarmIntervals');

  const sorted = [...storage.shifts].sort((first, second) => second.startedAt - first.startedAt);
  storage.shifts = sorted;
  storage.lastShift = sorted[0] || null;
}
