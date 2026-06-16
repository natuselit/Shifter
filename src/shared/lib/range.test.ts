import { describe, expect, it } from 'vitest';
import { getDateKey } from '../../entities/shift/model';
import type { Shift } from '../../entities/shift/types';
import { filterShiftsByRange, getNextRangeState, getRangeKeys } from './range';

describe('range helpers', () => {
  it('normalizes reversed ranges', () => {
    expect(getRangeKeys({ rangeStartKey: '2026-06-20', rangeEndKey: '2026-06-15' })).toEqual({
      startKey: '2026-06-15',
      endKey: '2026-06-20'
    });
  });

  it('selects range start and end', () => {
    const start = getNextRangeState({ rangeStartKey: null, rangeEndKey: null }, '2026-06-15');
    expect(start).toEqual({ rangeStartKey: '2026-06-15', rangeEndKey: null });
    expect(getNextRangeState(start, '2026-06-17')).toEqual({ rangeStartKey: '2026-06-15', rangeEndKey: '2026-06-17' });
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
