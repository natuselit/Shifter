import { CalendarGrid, type CalendarGridProps } from '@/shared/ui';
import { formatMonth } from '@/shared/lib';
import type { ReactNode } from 'react';

interface CalendarPanelProps extends CalendarGridProps {
  title?: string;
  subtitle?: string;
  status?: string;
  children?: ReactNode;
  onMonthChange: (month: Date) => void;
}

export function CalendarPanel({
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
        <div className="calendar-title-block">
          <h2>{title || formatMonth(visibleMonth)}</h2>
          {subtitle && <p>{subtitle}</p>}
          {status && <span>{status}</span>}
        </div>
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
        activeDateKey={activeDateKey}
        ariaLabel={ariaLabel}
        onDateClick={onDateClick}
      />
      {children}
    </section>
  );
}
