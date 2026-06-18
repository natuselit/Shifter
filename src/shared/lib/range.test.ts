import { describe, expect, it } from 'vitest';
import { getNextRangeState, getRangeKeys } from './range';

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
});
