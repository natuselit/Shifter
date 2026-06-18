import { normalizeSettingsValue, type Settings } from '@/entities/settings';
import {
  isValidTimestamp,
  normalizeRateMultiplier,
  normalizeShiftValue,
  type RateMultiplier,
  type Shift
} from '@/entities/shift';
import { readStorageItem, removeStorageItem, writeStorageItem } from '@/shared/storage';

interface CachedValue<T> {
  raw: string | null;
  value: T;
}

export interface StorageSnapshot {
  settings: Settings;
  shifts: Shift[];
  startedAt: number | null;
  activeRate: number | null;
  rateMultiplier: RateMultiplier;
}

let settingsCache: CachedValue<Settings> | null = null;
let shiftsCache: CachedValue<Shift[]> | null = null;
let lastShiftCache: CachedValue<Shift | null> | null = null;

function parseJsonValue<T>(raw: string | null, fallback: T): T {
  try {
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeJsonRaw<T>(key: string, value: T): string {
  const raw = JSON.stringify(value);
  writeStorageItem(key, raw);
  return raw;
}

function readSettings(): Settings {
  const raw = readStorageItem('settings');
  if (settingsCache?.raw === raw) return settingsCache.value;

  const value = normalizeSettingsValue(parseJsonValue<Partial<Settings>>(raw, {}));
  settingsCache = { raw, value };
  return value;
}

function readLastShift(): Shift | null {
  const raw = readStorageItem('lastShift');
  if (lastShiftCache?.raw === raw) return lastShiftCache.value;

  const value = normalizeShiftValue(parseJsonValue<unknown>(raw, null));
  lastShiftCache = { raw, value };
  return value;
}

function readShifts(): Shift[] {
  const raw = readStorageItem('shifts');
  if (shiftsCache?.raw === raw) return shiftsCache.value;

  const rawShifts = parseJsonValue<unknown>(raw, []);
  const value = Array.isArray(rawShifts)
    ? rawShifts.map((shift, index) => normalizeShiftValue(shift, index)).filter((shift): shift is Shift => Boolean(shift))
    : [];

  shiftsCache = { raw, value };
  return value;
}

export const storage = {
  get settings(): Settings {
    return readSettings();
  },
  set settings(value: Settings) {
    const settings = normalizeSettingsValue(value);
    const raw = writeJsonRaw('settings', settings);
    settingsCache = settingsCache?.raw === raw ? { raw, value: settingsCache.value } : { raw, value: settings };
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
    return readLastShift();
  },
  set lastShift(value: Shift | null) {
    if (value) {
      const raw = writeJsonRaw('lastShift', value);
      lastShiftCache = lastShiftCache?.raw === raw ? { raw, value: lastShiftCache.value } : { raw, value };
    } else {
      removeStorageItem('lastShift');
      lastShiftCache = { raw: null, value: null };
    }
  },
  get shifts(): Shift[] {
    return readShifts();
  },
  set shifts(value: Shift[]) {
    const shifts = [...value];
    const raw = writeJsonRaw('shifts', shifts);
    shiftsCache = shiftsCache?.raw === raw ? { raw, value: shiftsCache.value } : { raw, value: shifts };
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

export function readStorageSnapshot(): StorageSnapshot {
  return {
    settings: storage.settings,
    shifts: storage.shifts,
    startedAt: storage.startedAt,
    activeRate: storage.activeRate,
    rateMultiplier: storage.rateMultiplier
  };
}

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
