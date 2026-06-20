import { describe, expect, it } from 'vitest';
import {
  calculatePay,
  detectShiftType,
  getShiftsInTimeRange,
  getShiftsOnDate,
  hasShiftOnDate,
  normalizeShiftValue
} from './model';

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

  it('finds shifts on a date while respecting ignored ids', () => {
    const shift = {
      id: '1',
      startedAt: new Date(2026, 5, 15, 23, 30).getTime(),
      endedAt: new Date(2026, 5, 16, 1, 30).getTime(),
      rate: 100,
      shiftType: 'Поза графіком' as const,
      rateMultiplier: 1 as const,
      doubleRate: false
    };

    expect(hasShiftOnDate([shift], '2026-06-15')).toBe(true);
    expect(hasShiftOnDate([shift], '2026-06-15', shift.id)).toBe(false);
    expect(hasShiftOnDate([shift], 'bad-date')).toBe(false);
  });

  it('gets shifts from a sorted history range without scanning unrelated dates', () => {
    const shifts = [20, 18, 15, 10].map((day) => ({
      id: String(day),
      startedAt: new Date(2026, 5, day, 6, 30).getTime(),
      endedAt: new Date(2026, 5, day, 14, 30).getTime(),
      rate: 100,
      shiftType: '1 зміна' as const,
      rateMultiplier: 1 as const,
      doubleRate: false
    }));

    expect(getShiftsOnDate(shifts, '2026-06-18').map((shift) => shift.id)).toEqual(['18']);
    expect(
      getShiftsInTimeRange(shifts, new Date(2026, 5, 15).getTime(), new Date(2026, 5, 19).getTime()).map(
        (shift) => shift.id
      )
    ).toEqual(['18', '15']);
  });
});
