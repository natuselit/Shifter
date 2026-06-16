import { getDateKey } from '../../entities/shift/model';
import { formatDateOnly, formatMonth } from '../../shared/lib/format';
import { getRangeKeys, type RangeState } from '../../shared/lib/range';
import type { ReactNode } from 'react';

interface CalendarAction {
  label: string;
  onClick: () => void;
}

interface CalendarGridProps {
  visibleMonth: Date;
  selectedDateKey?: string | null;
  rangeState?: RangeState;
  shiftDateKeys?: Set<string>;
  titleId?: string;
  ariaLabel: string;
  onDateClick: (date: Date, dateKey: string) => void;
}

interface CalendarPanelProps extends CalendarGridProps {
  title?: string;
  actions?: CalendarAction[];
  secondaryActions?: CalendarAction[];
  children?: ReactNode;
  onMonthChange: (month: Date) => void;
}

function getRangeClasses(dateKey: string, state?: RangeState) {
  if (!state) return '';
  const range = getRangeKeys(state);
  if (!range) return dateKey === state.rangeStartKey ? ' range-edge' : '';

  const inRange = dateKey >= range.startKey && dateKey <= range.endKey;
  const edge = dateKey === range.startKey || dateKey === range.endKey;
  return `${inRange ? ' in-range' : ''}${edge ? ' range-edge' : ''}`;
}

export function CalendarGrid({
  visibleMonth,
  selectedDateKey,
  rangeState,
  shiftDateKeys = new Set<string>(),
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
      <div className="calendar-grid" aria-label={ariaLabel}>
        {days.map((date) => {
          const dateKey = getDateKey(date);
          const className = [
            'calendar-day',
            date.getMonth() !== monthIndex ? 'outside' : '',
            dateKey === todayKey ? 'today' : '',
            dateKey === selectedDateKey ? 'selected' : '',
            shiftDateKeys.has(dateKey) ? 'has-shifts' : '',
            getRangeClasses(dateKey, rangeState)
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={dateKey}
              className={className}
              type="button"
              aria-label={formatDateOnly(date.getTime())}
              onClick={() => onDateClick(date, dateKey)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </>
  );
}

export function CalendarPanel({
  visibleMonth,
  selectedDateKey,
  rangeState,
  shiftDateKeys,
  title,
  ariaLabel,
  actions = [],
  secondaryActions = [],
  children,
  onDateClick,
  onMonthChange
}: CalendarPanelProps) {
  return (
    <section className="panel calendar-panel">
      <div className="calendar-header">
        <button
          className="calendar-nav"
          type="button"
          aria-label="Попередній місяць"
          onClick={() => onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
        >
          ‹
        </button>
        <h2>{title || formatMonth(visibleMonth)}</h2>
        <button
          className="calendar-nav"
          type="button"
          aria-label="Наступний місяць"
          onClick={() => onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
        >
          ›
        </button>
      </div>
      <CalendarGrid
        visibleMonth={visibleMonth}
        selectedDateKey={selectedDateKey}
        rangeState={rangeState}
        shiftDateKeys={shiftDateKeys}
        ariaLabel={ariaLabel}
        onDateClick={onDateClick}
      />
      {actions.length > 0 && (
        <div className={`calendar-actions ${actions.length === 3 ? 'calendar-actions-three' : ''}`}>
          {actions.map((action) => (
            <button className="clear" type="button" key={action.label} onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      )}
      {secondaryActions.length > 0 && (
        <div
          className={`calendar-actions report-actions ${secondaryActions.length === 3 ? 'calendar-actions-three' : ''}`}
        >
          {secondaryActions.map((action) => (
            <button className="clear" type="button" key={action.label} onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      )}
      {children}
    </section>
  );
}
