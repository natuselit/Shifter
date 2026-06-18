import { isShiftInDateRange, type Shift } from '@/entities/shift';
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
  return shifts.filter((shift) => isShiftInDateRange(shift, range.startKey, range.endKey));
}
