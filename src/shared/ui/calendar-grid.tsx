import { getDateKey } from '@/shared/lib/date';
import { formatDateOnly, formatMonth } from '@/shared/lib/format';
import { getRangeKeys, type RangeState } from '@/shared/lib/range';

export interface CalendarGridProps {
  visibleMonth: Date;
  selectedDateKey?: string | null;
  rangeState?: RangeState;
  shiftDateKeys?: Set<string>;
  activeDateKey?: string | null;
  titleId?: string;
  ariaLabel: string;
  onDateClick: (date: Date, dateKey: string) => void;
}

function getRangeClasses(dateKey: string, state?: RangeState) {
  if (!state) return '';
  const range = getRangeKeys(state);
  if (!range) return dateKey === state.rangeStartKey ? ' range-edge' : '';

  const inRange = dateKey >= range.startKey && dateKey <= range.endKey;
  const edge = dateKey === range.startKey || dateKey === range.endKey;
  return `${inRange ? ' in-range' : ''}${edge ? ' range-edge' : ''}`;
}

function getDateLabel(date: Date, dateKey: string, selectedDateKey: string | null | undefined, todayKey: string) {
  const parts = [formatDateOnly(date.getTime())];
  if (dateKey === todayKey) parts.push('сьогодні');
  if (dateKey === selectedDateKey) parts.push('вибрано');
  return parts.join(', ');
}

export function CalendarGrid({
  visibleMonth,
  selectedDateKey,
  rangeState,
  shiftDateKeys = new Set<string>(),
  activeDateKey,
  titleId,
  ariaLabel,
  onDateClick
}: CalendarGridProps) {
  const year = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - startOffset);
  const todayKey = getDateKey(new Date());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });

  return (
    <>
      {titleId && <h2 id={titleId}>{formatMonth(visibleMonth)}</h2>}
      <div className="calendar-weekdays" aria-hidden="true">
        <span>Пн</span>
        <span>Вт</span>
        <span>Ср</span>
        <span>Чт</span>
        <span>Пт</span>
        <span>Сб</span>
        <span>Нд</span>
      </div>
      <div className="calendar-grid" role="grid" aria-label={ariaLabel}>
        {days.map((date) => {
          const dateKey = getDateKey(date);
          const className = [
            'calendar-day',
            date.getMonth() !== monthIndex ? 'outside' : '',
            dateKey === todayKey ? 'today' : '',
            dateKey === selectedDateKey ? 'selected' : '',
            shiftDateKeys.has(dateKey) ? 'has-shifts' : '',
            dateKey === activeDateKey ? 'active-shift' : '',
            getRangeClasses(dateKey, rangeState)
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={dateKey}
              className={className}
              type="button"
              role="gridcell"
              aria-label={getDateLabel(date, dateKey, selectedDateKey, todayKey)}
              aria-current={dateKey === todayKey ? 'date' : undefined}
              aria-pressed={dateKey === selectedDateKey || undefined}
              onClick={() => onDateClick(date, dateKey)}
            >
              <span className="calendar-day-number">{date.getDate()}</span>
              <span className="calendar-day-marker" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </>
  );
}
