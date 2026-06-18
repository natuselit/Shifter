import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from '@/entities/app-state';
import { calculatePay } from '@/entities/shift';
import { finishCurrentShift } from './shift-timer';

function installLocalStorage() {
  const values = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  });
}

describe('shift timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installLocalStorage();
    storage.settings = {
      rate: 100,
      startHoldSeconds: 3,
      endHoldSeconds: 5,
      surname: '',
      accentColor: 'yellow'
    };
    storage.shifts = [];
  });

  it.each([
    [1, 800],
    [1.5, 1200],
    [2, 1600]
  ] as const)('finishes current shift with x%s multiplier', (rateMultiplier, expectedPay) => {
    const startedAt = new Date(2026, 5, 15, 6, 30).getTime();
    const endedAt = new Date(2026, 5, 15, 14, 30).getTime();
    vi.setSystemTime(endedAt);
    storage.startedAt = startedAt;
    storage.activeRate = 100;
    storage.rateMultiplier = rateMultiplier;

    const result = finishCurrentShift();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shift.rateMultiplier).toBe(rateMultiplier);
    expect(result.shift.doubleRate).toBe(rateMultiplier === 2);
    expect(calculatePay(result.shift)).toBe(expectedPay);
  });

  it('falls back to settings rate when active rate is missing', () => {
    const startedAt = new Date(2026, 5, 15, 6, 30).getTime();
    const endedAt = new Date(2026, 5, 15, 14, 30).getTime();
    vi.setSystemTime(endedAt);
    storage.startedAt = startedAt;
    storage.activeRate = null;
    storage.rateMultiplier = 1;

    const result = finishCurrentShift();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shift.rate).toBe(100);
    expect(calculatePay(result.shift)).toBe(800);
  });
});
