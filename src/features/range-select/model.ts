import type { Shift } from '@/entities/shift';
import { getTimestampFromDateKey } from '@/shared/lib';
import { getRangeKeys, type RangeState } from '@/shared/lib/range';

export {
  clearRangeState,
  getNextRangeState,
  getRangeKeys,
  getRangeLabel,
  type RangeState
} from '@/shared/lib/range';

export function filterShiftsByRange<T extends Shift>(shifts: T[], state: RangeState): T[] {
  const range = getRangeKeys(state);
  if (!range) return shifts;

  const start = getTimestampFromDateKey(range.startKey);
  const end = getTimestampFromDateKey(range.endKey, true);
  if (start === null || end === null) return [];

  const filtered: T[] = [];
  for (const shift of shifts) {
    if (shift.startedAt >= start && shift.startedAt <= end) filtered.push(shift);
  }

  return filtered;
}
