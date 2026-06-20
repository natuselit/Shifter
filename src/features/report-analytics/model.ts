import {
  calculatePay,
  getDateKey,
  getShiftsInTimeRange,
  getTimestampFromDateKey,
  normalizeRateMultiplier,
  type Shift
} from '@/entities/shift';
import { formatDateOnly, formatHoursMinutes, formatMoney } from '@/shared/lib';
import type { NormalizedRange } from '@/shared/lib/range';

export type ChartMode = 'pay' | 'hours';

export const chartModes: Array<{ value: ChartMode; label: string }> = [
  { value: 'pay', label: 'Гроші' },
  { value: 'hours', label: 'Години' }
];

const percentFormatter = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 });
const hourMs = 3600000;
const minuteMs = 60000;
const maxScheduleDiffRows = 3;

export interface DayStats {
  pay: number;
  ms: number;
  count: number;
  timestamp: number;
  endedAt: number;
}

export interface WeekStats {
  pay: number;
  ms: number;
  count: number;
  timestamp: number;
}

interface ScheduleEntry {
  dateKey: string;
  plannedInMinutes: number | null;
  plannedOutMinutes: number | null;
  plannedTotalMs: number | null;
}

interface ScheduleDiff {
  totalDiffMs: number | null;
  inDiffMs: number | null;
  outDiffMs: number | null;
}

interface ScheduleDiffRow {
  dateKey: string;
  stats: DayStats;
  entry: ScheduleEntry | undefined;
  diff: ScheduleDiff;
}

export function getMonthShifts<T extends Shift>(shifts: T[], monthDate: Date): T[] {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime();
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).getTime();
  return getShiftsInTimeRange(shifts, start, end);
}

export function getWeekRange(date = new Date()): { startKey: string; endKey: string } {
  const start = new Date(date);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { startKey: getDateKey(start), endKey: getDateKey(end) };
}

export function buildSalarySummary(shifts: Shift[]) {
  let totalPay = 0;
  let totalMs = 0;

  for (const shift of shifts) {
    totalPay += calculatePay(shift);
    totalMs += Math.max(0, shift.endedAt - shift.startedAt);
  }

  return { totalPay, totalMs };
}

function getChartDates(range: NormalizedRange | null, visibleMonth: Date): Date[] {
  const chartDates: Date[] = [];

  if (range) {
    const start = getTimestampFromDateKey(range.startKey);
    const end = getTimestampFromDateKey(range.endKey);
    if (start !== null && end !== null) {
      for (const date = new Date(start); date.getTime() <= end; date.setDate(date.getDate() + 1)) {
        chartDates.push(new Date(date));
      }
    }
    return chartDates;
  }

  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    chartDates.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
  }

  return chartDates;
}

function getDateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function insertScheduleDiffRow(rows: ScheduleDiffRow[], row: ScheduleDiffRow): void {
  const diffMs = Math.abs(row.diff.totalDiffMs || 0);
  let index = 0;

  while (index < rows.length && Math.abs(rows[index].diff.totalDiffMs || 0) >= diffMs) {
    index += 1;
  }

  if (index >= maxScheduleDiffRows) return;
  rows.splice(index, 0, row);
  if (rows.length > maxScheduleDiffRows) rows.length = maxScheduleDiffRows;
}

export function buildReportAnalytics({
  reportShifts,
  range,
  visibleMonth,
  scheduleEntries,
  chartMode
}: {
  reportShifts: Shift[];
  range: NormalizedRange | null;
  visibleMonth: Date;
  scheduleEntries: ScheduleEntry[];
  chartMode: ChartMode;
}) {
  let totalPay = 0;
  let totalMs = 0;
  const shiftTypes = new Map<string, number>();
  const multipliers = new Map<string, number>([
    ['x1', 0],
    ['x1.5', 0],
    ['x2', 0]
  ]);
  const dayStats = new Map<string, DayStats>();
  const weekStats = new Map<string, WeekStats>();
  const scheduleByDateKey = new Map<string, ScheduleEntry>();
  let scheduleEntriesWithPlan = 0;
  let bestWeek: WeekStats | undefined;

  for (const entry of scheduleEntries) {
    scheduleByDateKey.set(entry.dateKey, entry);
    if (entry.plannedTotalMs !== null) scheduleEntriesWithPlan += 1;
  }

  for (const shift of reportShifts) {
    const shiftType = shift.shiftType;
    const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));
    const pay = calculatePay(shift);
    const ms = Math.max(0, shift.endedAt - shift.startedAt);
    const shiftDate = new Date(shift.startedAt);
    const dayKey = getDateKeyFromDate(shiftDate);
    const weekOffset = (shiftDate.getDay() + 6) % 7;
    const weekStart = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate() - weekOffset);
    const weekKey = getDateKeyFromDate(weekStart);
    const multiplierKey = `x${multiplier}`;

    totalPay += pay;
    totalMs += ms;

    shiftTypes.set(shiftType, (shiftTypes.get(shiftType) || 0) + 1);
    multipliers.set(multiplierKey, (multipliers.get(multiplierKey) || 0) + 1);

    const currentDay = dayStats.get(dayKey);
    if (currentDay) {
      currentDay.pay += pay;
      currentDay.ms += ms;
      currentDay.count += 1;
      currentDay.timestamp = Math.min(currentDay.timestamp, shift.startedAt);
      currentDay.endedAt = Math.max(currentDay.endedAt, shift.endedAt);
    } else {
      dayStats.set(dayKey, {
        pay,
        ms,
        count: 1,
        timestamp: shift.startedAt,
        endedAt: shift.endedAt
      });
    }

    let currentWeek = weekStats.get(weekKey);
    if (currentWeek) {
      currentWeek.pay += pay;
      currentWeek.ms += ms;
      currentWeek.count += 1;
    } else {
      currentWeek = {
        pay,
        ms,
        count: 1,
        timestamp: weekStart.getTime()
      };
      weekStats.set(weekKey, currentWeek);
    }

    if (!bestWeek || currentWeek.pay > bestWeek.pay) bestWeek = currentWeek;
  }

  const totals = { totalPay, totalMs };
  const averagePay = reportShifts.length > 0 ? totalPay / reportShifts.length : 0;
  const averageShiftMs = reportShifts.length > 0 ? totalMs / reportShifts.length : 0;
  const averagePayPerHour = totalMs > 0 ? totalPay / (totalMs / hourMs) : 0;
  const chartDates = getChartDates(range, visibleMonth);
  const plannedChartValues = new Map<string, number>();
  let plannedScheduleMs = 0;

  for (const date of chartDates) {
    const dateKey = getDateKeyFromDate(date);
    const plannedTotalMs = scheduleByDateKey.get(dateKey)?.plannedTotalMs || 0;
    plannedScheduleMs += plannedTotalMs;
    plannedChartValues.set(dateKey, plannedTotalMs / hourMs);
  }

  const totalScheduleDiffMs = totalMs - plannedScheduleMs;
  const scheduleDiffRows: ScheduleDiffRow[] = [];

  for (const [dateKey, stats] of dayStats) {
    const entry = scheduleByDateKey.get(dateKey);
    const diff = getScheduleDiff(entry, { startedAt: stats.timestamp, endedAt: stats.endedAt });
    if (entry?.plannedTotalMs === null || diff.totalDiffMs === null) continue;
    insertScheduleDiffRow(scheduleDiffRows, { dateKey, stats, entry, diff });
  }

  const shiftTypePercentages = ['1 зміна', '2 зміна', 'Поза графіком'].map((label) => {
    const count = shiftTypes.get(label) || 0;
    const percent = reportShifts.length > 0 ? (count / reportShifts.length) * 100 : 0;
    return [label, `${count} · ${percentFormatter.format(percent)}%`] as [string, string];
  });

  const getChartValue = (stats: { pay: number; ms: number } | undefined) => {
    if (!stats) return 0;
    if (chartMode === 'hours') return stats.ms / hourMs;
    return stats.pay;
  };
  const getPlannedChartValue = (dateKey: string) => {
    if (chartMode !== 'hours') return 0;
    return plannedChartValues.get(dateKey) || 0;
  };
  const getChartTitle = (date: Date, stats: DayStats | undefined) => {
    const dateKey = getDateKeyFromDate(date);
    const entry = scheduleByDateKey.get(dateKey);
    const diff = stats ? getScheduleDiff(entry, { startedAt: stats.timestamp, endedAt: stats.endedAt }) : null;

    if (!stats) {
      if (chartMode === 'hours' && entry?.plannedTotalMs) {
        return [formatDateOnly(date.getTime()), 'Факт: -', `План: ${formatHoursMinutes(entry.plannedTotalMs)}`].join(
          '\n'
        );
      }
      return formatDateOnly(date.getTime());
    }
    if (chartMode === 'hours') {
      return [
        formatDateOnly(date.getTime()),
        `Факт: ${formatHoursMinutes(stats.ms)}`,
        `План: ${entry?.plannedTotalMs ? formatHoursMinutes(entry.plannedTotalMs) : '-'}`,
        `Різниця: ${formatSignedHoursMinutes(diff?.totalDiffMs ?? null)}`,
        `Прихід: ${formatSignedHoursMinutes(diff?.inDiffMs ?? null)}`,
        `Вихід: ${formatSignedHoursMinutes(diff?.outDiffMs ?? null)}`
      ].join('\n');
    }
    return `${formatDateOnly(date.getTime())}: ${formatMoney(stats.pay)}`;
  };
  let maxChartValue = 1;
  for (const stats of dayStats.values()) {
    maxChartValue = Math.max(maxChartValue, getChartValue(stats));
  }
  if (chartMode === 'hours') {
    for (const plannedValue of plannedChartValues.values()) {
      maxChartValue = Math.max(maxChartValue, plannedValue);
    }
  }

  return {
    ...totals,
    averagePay,
    averageShiftMs,
    averagePayPerHour,
    bestWeek,
    chartDates,
    dayStats,
    getChartTitle,
    getChartValue,
    getPlannedChartValue,
    maxChartValue,
    multipliers,
    plannedScheduleMs,
    scheduleDiffRows,
    scheduleEntriesWithPlan,
    shiftTypePercentages,
    totalScheduleDiffMs,
    weekStats
  };
}

function getMinutesFromTimeOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

function getScheduleDiff(
  entry: ScheduleEntry | undefined,
  shift: Pick<Shift, 'startedAt' | 'endedAt'> | undefined
): ScheduleDiff {
  if (!entry || !shift) return { totalDiffMs: null, inDiffMs: null, outDiffMs: null };

  const factMs = Math.max(0, shift.endedAt - shift.startedAt);
  return {
    totalDiffMs: entry.plannedTotalMs === null ? null : factMs - entry.plannedTotalMs,
    inDiffMs:
      entry.plannedInMinutes === null
        ? null
        : (getMinutesFromTimeOfDay(shift.startedAt) - entry.plannedInMinutes) * minuteMs,
    outDiffMs:
      entry.plannedOutMinutes === null
        ? null
        : (getMinutesFromTimeOfDay(shift.endedAt) - entry.plannedOutMinutes) * minuteMs
  };
}

function formatSignedHoursMinutes(milliseconds: number | null): string {
  if (milliseconds === null) return '-';
  const sign = milliseconds > 0 ? '+' : milliseconds < 0 ? '-' : '';
  const totalMinutes = Math.floor(Math.abs(milliseconds) / minuteMs);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
