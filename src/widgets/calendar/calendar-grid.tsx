import { CalendarGrid, type CalendarGridProps } from '@/shared/ui';
import { formatMonth } from '@/shared/lib';
import { memo, useCallback, type ReactNode } from 'react';

interface CalendarPanelProps extends CalendarGridProps {
  title?: string;
  subtitle?: string;
  status?: string;
  children?: ReactNode;
  onMonthChange: (month: Date) => void;
}

function CalendarPanelView({
  visibleMonth,
  selectedDateKey,
  rangeState,
  shiftDateKeys,
  activeDateKey,
  title,
  subtitle,
  status,
  ariaLabel,
  children,
  onDateClick,
  onMonthChange
}: CalendarPanelProps) {
  const showPreviousMonth = useCallback(() => {
    onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1));
  }, [onMonthChange, visibleMonth]);

  const showNextMonth = useCallback(() => {
    onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1));
  }, [onMonthChange, visibleMonth]);

  return (
    <section className="panel calendar-panel">
      <div className="calendar-header">
        <button
          className="calendar-nav"
          type="button"
          aria-label="Попередній місяць"
          onClick={showPreviousMonth}
        >
          ‹
        </button>
        <div className="calendar-title-block">
          <h2>{title || formatMonth(visibleMonth)}</h2>
          {subtitle && <p>{subtitle}</p>}
          {status && <span>{status}</span>}
        </div>
        <button
          className="calendar-nav"
          type="button"
          aria-label="Наступний місяць"
          onClick={showNextMonth}
        >
          ›
        </button>
      </div>
      <CalendarGrid
        visibleMonth={visibleMonth}
        selectedDateKey={selectedDateKey}
        rangeState={rangeState}
        shiftDateKeys={shiftDateKeys}
        activeDateKey={activeDateKey}
        ariaLabel={ariaLabel}
        onDateClick={onDateClick}
      />
      {children}
    </section>
  );
}

export const CalendarPanel = memo(CalendarPanelView);
