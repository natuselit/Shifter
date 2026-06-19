import { describe, expect, it } from 'vitest';
import { getDateKey, type Shift } from '@/entities/shift';
import { filterShiftsByRange } from './model';

describe('range select model', () => {
  it('returns the same list when range is incomplete', () => {
    const shifts: Shift[] = [];

    expect(filterShiftsByRange(shifts, { rangeStartKey: '2026-06-15', rangeEndKey: null })).toBe(shifts);
  });

  it('filters shifts by date range', () => {
    const shifts: Shift[] = [15, 18, 25].map((day) => ({
      id: String(day),
      startedAt: new Date(2026, 5, day, 6, 30).getTime(),
      endedAt: new Date(2026, 5, day, 14, 30).getTime(),
      rate: 100,
      shiftType: '1 зміна',
      rateMultiplier: 1,
      doubleRate: false
    }));

    expect(
      filterShiftsByRange(shifts, { rangeStartKey: '2026-06-15', rangeEndKey: '2026-06-20' }).map((shift) =>
        getDateKey(shift.startedAt)
      )
    ).toEqual(['2026-06-15', '2026-06-18']);
  });
});
