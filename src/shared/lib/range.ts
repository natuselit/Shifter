import type { Shift } from '../../entities/shift/types';
import { getTimestampFromDateKey, isShiftInDateRange } from '../../entities/shift/model';
import { formatDateOnly } from './format';

export interface RangeState {
  rangeStartKey: string | null;
  rangeEndKey: string | null;
}

export interface NormalizedRange {
  startKey: string;
  endKey: string;
}

export function getRangeKeys(state: RangeState): NormalizedRange | null {
  if (!state.rangeStartKey || !state.rangeEndKey) return null;
  return state.rangeStartKey <= state.rangeEndKey
    ? { startKey: state.rangeStartKey, endKey: state.rangeEndKey }
    : { startKey: state.rangeEndKey, endKey: state.rangeStartKey };
}

export function getNextRangeState(state: RangeState, dateKey: string): RangeState {
  if (!state.rangeStartKey || state.rangeEndKey) {
    return { rangeStartKey: dateKey, rangeEndKey: null };
  }

  if (dateKey < state.rangeStartKey) {
    return { rangeStartKey: dateKey, rangeEndKey: state.rangeStartKey };
  }

  return { rangeStartKey: state.rangeStartKey, rangeEndKey: dateKey };
}

export function clearRangeState(): RangeState {
  return { rangeStartKey: null, rangeEndKey: null };
}

export function getRangeLabel(state: RangeState): string {
  const range = getRangeKeys(state);
  if (!range) return '';

  const start = getTimestampFromDateKey(range.startKey);
  const end = getTimestampFromDateKey(range.endKey);
  if (start === null || end === null) return '';

  const startText = formatDateOnly(start);
  const endText = formatDateOnly(end);
  return range.startKey === range.endKey ? startText : `${startText} - ${endText}`;
}

export function filterShiftsByRange<T extends Shift>(shifts: T[], state: RangeState): T[] {
  const range = getRangeKeys(state);
  if (!range) return shifts;
  return shifts.filter((shift) => isShiftInDateRange(shift, range.startKey, range.endKey));
}
