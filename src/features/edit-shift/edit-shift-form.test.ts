import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveShift } from '../../entities/shift/types';
import { storage } from '../../shared/storage/local-storage';
import { saveActiveShiftValue } from './edit-shift-form';

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
