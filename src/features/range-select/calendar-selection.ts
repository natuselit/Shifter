import { getDateKey } from '../../entities/shift/model';
import { clearRangeState, type RangeState } from './model';

export interface CalendarSelection {
  selectedDateKey: string | null;
  rangeState: RangeState;
  visibleMonth: Date;
}

export function getTodayCalendarSelection(): CalendarSelection {
  const today = new Date();
  const key = getDateKey(today);

  return {
    selectedDateKey: key,
    rangeState: { rangeStartKey: key, rangeEndKey: key },
    visibleMonth: new Date(today.getFullYear(), today.getMonth(), 1)
  };
}

export function getClearedCalendarSelection(visibleMonth: Date): CalendarSelection {
  return {
    selectedDateKey: null,
    rangeState: clearRangeState(),
    visibleMonth
  };
}
