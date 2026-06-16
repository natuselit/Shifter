import { useMemo, useState } from 'react';
import { calculatePay, getDateKey, getTimestampFromDateKey, normalizeRateMultiplier } from '../../entities/shift/model';
import type { Shift } from '../../entities/shift/types';
import { formatDateOnly, formatHoursMinutes, formatMoney, formatMonth, formatShortDate } from '../../shared/lib/format';
import {
  clearRangeState,
  filterShiftsByRange,
  getNextRangeState,
  getRangeKeys,
  getRangeLabel
} from '../../features/range-select/model';
import { getTodayCalendarSelection } from '../../features/range-select/calendar-selection';
import { useSnapshot } from '../../app/providers/store-provider';
import { CalendarPanel } from '../../widgets/calendar/calendar-grid';

function getMonthShifts(shifts: Shift[], monthDate: Date): Shift[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  return shifts.filter((shift) => {
    const startedAt = new Date(shift.startedAt);
    return startedAt.getFullYear() === year && startedAt.getMonth() === month;
  });
}

function AnalyticsList({ entries, emptyText }: { entries: Array<[string, string]>; emptyText: string }) {
  return (
    <ul className="analytics-list">
      {(entries.length === 0 ? [[emptyText, '0'] as [string, string]] : entries).map(([label, value]) => (
        <li key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsPage() {
  const { shifts } = useSnapshot();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [rangeState, setRangeState] = useState(clearRangeState);
  const range = getRangeKeys(rangeState);
  const monthShifts = range ? filterShiftsByRange(shifts, rangeState) : getMonthShifts(shifts, visibleMonth);
  const shiftDateKeys = useMemo(
    () => new Set(getMonthShifts(shifts, visibleMonth).map((shift) => getDateKey(shift.startedAt))),
    [shifts, visibleMonth]
  );
  const totalPay = monthShifts.reduce((sum, shift) => sum + calculatePay(shift), 0);
  const totalMs = monthShifts.reduce((sum, shift) => sum + Math.max(0, shift.endedAt - shift.startedAt), 0);
  const averagePay = monthShifts.length > 0 ? totalPay / monthShifts.length : 0;
  const shiftTypes = new Map<string, number>();
  const multipliers = new Map<string, number>([
    ['x1', 0],
    ['x1.5', 0],
    ['x2', 0]
  ]);
  const dayStats = new Map<string, { pay: number; ms: number; count: number; timestamp: number }>();

  monthShifts.forEach((shift) => {
    const shiftType = shift.shiftType;
    const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));
    const dayKey = getDateKey(shift.startedAt);
    const pay = calculatePay(shift);
    const currentDay = dayStats.get(dayKey) || { pay: 0, ms: 0, count: 0, timestamp: shift.startedAt };

    shiftTypes.set(shiftType, (shiftTypes.get(shiftType) || 0) + 1);
    multipliers.set(`x${multiplier}`, (multipliers.get(`x${multiplier}`) || 0) + 1);
    dayStats.set(dayKey, {
      pay: currentDay.pay + pay,
      ms: currentDay.ms + Math.max(0, shift.endedAt - shift.startedAt),
      count: currentDay.count + 1,
      timestamp: currentDay.timestamp
    });
  });

  const chartDates: Date[] = [];
  if (range) {
    const start = getTimestampFromDateKey(range.startKey);
    const end = getTimestampFromDateKey(range.endKey);
    if (start !== null && end !== null) {
      for (const date = new Date(start); date <= new Date(end); date.setDate(date.getDate() + 1)) {
        chartDates.push(new Date(date));
      }
    }
  } else {
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      chartDates.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
    }
  }

  const maxDayPay = Math.max(1, ...Array.from(dayStats.values()).map((item) => item.pay));
  const title = getRangeLabel(rangeState) || formatMonth(visibleMonth);

  function selectToday() {
    const selection = getTodayCalendarSelection();
    setSelectedDateKey(selection.selectedDateKey);
    setRangeState(selection.rangeState);
    setVisibleMonth(selection.visibleMonth);
  }

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Огляд змін</p>
        <h1>Аналітика</h1>
      </header>
      <CalendarPanel
        visibleMonth={visibleMonth}
        title={title}
        selectedDateKey={selectedDateKey}
        rangeState={rangeState}
        shiftDateKeys={shiftDateKeys}
        ariaLabel="Календар аналітики"
        onMonthChange={(month) => {
          setVisibleMonth(month);
          setSelectedDateKey(null);
        }}
        onDateClick={(date, dateKey) => {
          setSelectedDateKey(dateKey);
          setRangeState((current) => getNextRangeState(current, dateKey));
          setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
        }}
        actions={[
          {
            label: 'Сьогодні',
            onClick: selectToday
          },
          {
            label: 'Місяць',
            onClick: () => {
              setSelectedDateKey(null);
              setRangeState(clearRangeState());
            }
          },
          {
            label: 'Скинути',
            onClick: () => {
              setSelectedDateKey(null);
              setRangeState(clearRangeState());
            }
          }
        ]}
      />
      <section className="panel dashboard-summary analytics-summary" aria-label="Підсумки місяця">
        <div className="summary-metric">
          <span>Сума</span>
          <strong>{formatMoney(totalPay)}</strong>
        </div>
        <div className="summary-metric">
          <span>Години</span>
          <strong>{formatHoursMinutes(totalMs)}</strong>
        </div>
        <div className="summary-metric">
          <span>Зміни</span>
          <strong>{monthShifts.length}</strong>
        </div>
        <div className="summary-metric">
          <span>Середня</span>
          <strong>{formatMoney(averagePay)}</strong>
        </div>
      </section>
      <section className="panel">
        <div className="section-header">
          <h2>Дні</h2>
        </div>
        <div className="analytics-chart" aria-label="Графік по днях">
          {chartDates.map((date) => {
            const dateKey = getDateKey(date);
            const stats = dayStats.get(dateKey);
            const height = stats ? Math.max(6, Math.round((stats.pay / maxDayPay) * 140)) : 3;

            return (
              <div className="chart-day" key={dateKey}>
                <div
                  className="chart-bar"
                  style={{ height }}
                  title={
                    stats
                      ? `${formatDateOnly(date.getTime())}: ${formatMoney(stats.pay)}`
                      : formatDateOnly(date.getTime())
                  }
                />
                <span className="chart-label">{range ? formatShortDate(date.getTime()) : date.getDate()}</span>
              </div>
            );
          })}
        </div>
        <p className="empty" hidden={monthShifts.length > 0}>
          {range ? 'За цей період записів немає.' : 'За цей місяць записів немає.'}
        </p>
      </section>
      <section className="panel dashboard-lists analytics-lists">
        <div className="dashboard-list-section">
          <h2>Типи змін</h2>
          <AnalyticsList
            entries={Array.from(shiftTypes.entries())
              .sort((first, second) => second[1] - first[1])
              .map(([label, count]) => [label, String(count)])}
            emptyText="Змін немає"
          />
        </div>
        <div className="dashboard-list-section">
          <h2>Коефіцієнти</h2>
          <AnalyticsList
            entries={Array.from(multipliers.entries()).map(([label, count]) => [label, String(count)])}
            emptyText="Коефіцієнтів немає"
          />
        </div>
        <div className="dashboard-list-section">
          <h2>Найкращі дні</h2>
          <AnalyticsList
            entries={Array.from(dayStats.entries())
              .sort((first, second) => second[1].pay - first[1].pay)
              .slice(0, 3)
              .map(([, stats]) => [formatDateOnly(stats.timestamp), `${formatMoney(stats.pay)} · ${stats.count}`])}
            emptyText="Днів немає"
          />
        </div>
      </section>
    </main>
  );
}
