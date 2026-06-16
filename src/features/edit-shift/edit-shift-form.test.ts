import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveShift } from '../../entities/shift/types';
import { storage } from '../../shared/storage/local-storage';
import {
  formatTimeInput,
  getTimestampFromDateAndTime,
  parseTimeToMinutes,
  saveActiveShiftValue
} from './edit-shift-form';

function installLocalStorage() {
  const values = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  });
}

describe('edit active shift', () => {
  beforeEach(() => {
    installLocalStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0).getTime());
  });

  it('updates active rate and multiplier in storage', () => {
    const activeShift: ActiveShift = {
      id: '__active_shift__',
      active: true,
      startedAt: new Date(2026, 5, 15, 6, 30).getTime(),
      endedAt: Date.now(),
      rate: 100,
      shiftType: '1 зміна',
      rateMultiplier: 1,
      doubleRate: false
    };
    const nextStartedAt = new Date(2026, 5, 15, 7, 0).getTime();

    const savedShift = saveActiveShiftValue(activeShift, nextStartedAt, '150', 1.5);

    expect(storage.startedAt).toBe(nextStartedAt);
    expect(storage.activeRate).toBe(150);
    expect(storage.rateMultiplier).toBe(1.5);
    expect(savedShift).toMatchObject({
      startedAt: nextStartedAt,
      rate: 150,
      rateMultiplier: 1.5,
      doubleRate: false
    });
  });
});

describe('shift date and time helpers', () => {
  it('formats timestamps as HH:mm', () => {
    expect(formatTimeInput(new Date(2026, 5, 15, 6, 5).getTime())).toBe('06:05');
  });

  it('parses valid time values', () => {
    expect(parseTimeToMinutes('06:30')).toBe(390);
    expect(parseTimeToMinutes('6:05')).toBe(365);
  });

  it('rejects invalid time values', () => {
    expect(parseTimeToMinutes('24:00')).toBeNull();
    expect(parseTimeToMinutes('12:99')).toBeNull();
    expect(parseTimeToMinutes('bad')).toBeNull();
  });

  it('creates timestamp from selected date and time', () => {
    expect(getTimestampFromDateAndTime('2026-06-16', '14:30')).toBe(new Date(2026, 5, 16, 14, 30).getTime());
  });

  it('rejects invalid date and time combinations', () => {
    expect(getTimestampFromDateAndTime('2026-02-31', '14:30')).toBeNull();
    expect(getTimestampFromDateAndTime('2026-06-16', '99:30')).toBeNull();
  });
});
