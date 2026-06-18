import { describe, expect, it } from 'vitest';
import { calculatePay, detectShiftType, normalizeShiftValue } from './model';

describe('shift model', () => {
  it('detects shift types by start time', () => {
    expect(detectShiftType(new Date(2026, 5, 15, 6, 30).getTime())).toBe('1 зміна');
    expect(detectShiftType(new Date(2026, 5, 15, 14, 30).getTime())).toBe('2 зміна');
    expect(detectShiftType(new Date(2026, 5, 15, 23, 0).getTime())).toBe('Поза графіком');
  });

  it('calculates base and overtime pay', () => {
    const shift = {
      id: '1',
      startedAt: new Date(2026, 5, 15, 6, 30).getTime(),
      endedAt: new Date(2026, 5, 15, 15, 30).getTime(),
      rate: 100,
      shiftType: '1 зміна' as const,
      rateMultiplier: 1 as const,
      doubleRate: false
    };

    expect(calculatePay(shift)).toBe(950);
  });

  it('uses saved shift type for the pay window', () => {
    const shift = {
      id: '1',
      startedAt: new Date(2026, 5, 15, 14, 0).getTime(),
      endedAt: new Date(2026, 5, 15, 22, 30).getTime(),
      rate: 100,
      shiftType: '2 зміна' as const,
      rateMultiplier: 1 as const,
      doubleRate: false
    };

    expect(calculatePay(shift)).toBe(875);
  });

  it('keeps fractional rate precision in calculations', () => {
    const shift = {
      id: '1',
      startedAt: new Date(2026, 5, 15, 6, 30).getTime(),
      endedAt: new Date(2026, 5, 15, 14, 30).getTime(),
      rate: 234.995,
      shiftType: '1 зміна' as const,
      rateMultiplier: 1 as const,
      doubleRate: false
    };

    expect(calculatePay(shift)).toBe(1879.96);
  });

  it('normalizes legacy shift values', () => {
    const normalized = normalizeShiftValue({
      startedAt: new Date(2026, 5, 15, 14, 30).getTime(),
      endedAt: new Date(2026, 5, 15, 22, 30).getTime(),
      rate: '100',
      doubleRate: true
    });

    expect(normalized).toMatchObject({
      rate: 100,
      shiftType: '2 зміна',
      rateMultiplier: 2,
      doubleRate: true
    });
  });
});
