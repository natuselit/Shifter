import {
  calculatePay,
  getDateKey,
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

export function getMonthShifts<T extends Shift>(shifts: T[], monthDate: Date): T[] {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime();
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).getTime();

  return shifts.filter((shift) => shift.startedAt >= start && shift.startedAt < end);
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
  const totalPay = shifts.reduce((sum, shift) => sum + calculatePay(shift), 0);
  const totalMs = shifts.reduce((sum, shift) => sum + Math.max(0, shift.endedAt - shift.startedAt), 0);

  return { totalPay, totalMs };
}

function getChartDates(range: NormalizedRange | null, visibleMonth: Date): Date[] {
  const chartDates: Date[] = [];

  if (range) {
    const start = getTimestampFromDateKey(range.startKey);
    const end = getTimestampFromDateKey(range.endKey);
    if (start !== null && end !== null) {
      for (const date = new Date(start); date <= new Date(end); date.setDate(date.getDate() + 1)) {
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
  const totals = buildSalarySummary(reportShifts);
  const averagePay = reportShifts.length > 0 ? totals.totalPay / reportShifts.length : 0;
  const averageShiftMs = reportShifts.length > 0 ? totals.totalMs / reportShifts.length : 0;
  const averagePayPerHour = totals.totalMs > 0 ? totals.totalPay / (totals.totalMs / 3600000) : 0;
  const shiftTypes = new Map<string, number>();
  const multipliers = new Map<string, number>([
    ['x1', 0],
    ['x1.5', 0],
    ['x2', 0]
  ]);
  const dayStats = new Map<string, DayStats>();
  const weekStats = new Map<string, WeekStats>();
  const scheduleByDateKey = new Map(scheduleEntries.map((entry) => [entry.dateKey, entry]));

  reportShifts.forEach((shift) => {
    const shiftType = shift.shiftType;
    const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));
    const dayKey = getDateKey(shift.startedAt);
    const pay = calculatePay(shift);
    const ms = Math.max(0, shift.endedAt - shift.startedAt);
    const currentDay = dayStats.get(dayKey) || {
      pay: 0,
      ms: 0,
      count: 0,
      timestamp: shift.startedAt,
      endedAt: shift.endedAt
    };
    const weekStart = new Date(shift.startedAt);
    const weekOffset = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - weekOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = getDateKey(weekStart);
    const currentWeek = weekStats.get(weekKey) || {
      pay: 0,
      ms: 0,
      count: 0,
      timestamp: weekStart.getTime()
    };

    shiftTypes.set(shiftType, (shiftTypes.get(shiftType) || 0) + 1);
    multipliers.set(`x${multiplier}`, (multipliers.get(`x${multiplier}`) || 0) + 1);
    dayStats.set(dayKey, {
      pay: currentDay.pay + pay,
      ms: currentDay.ms + ms,
      count: currentDay.count + 1,
      timestamp: Math.min(currentDay.timestamp, shift.startedAt),
      endedAt: Math.max(currentDay.endedAt, shift.endedAt)
    });
    weekStats.set(weekKey, {
      pay: currentWeek.pay + pay,
      ms: currentWeek.ms + ms,
      count: currentWeek.count + 1,
      timestamp: currentWeek.timestamp
    });
  });

  const chartDates = getChartDates(range, visibleMonth);
  const scheduleEntriesInChart = chartDates
    .map((date) => scheduleByDateKey.get(getDateKey(date)))
    .filter((entry): entry is ScheduleEntry => Boolean(entry));
  const plannedScheduleMs = scheduleEntriesInChart.reduce((sum, entry) => sum + (entry.plannedTotalMs || 0), 0);
  const totalScheduleDiffMs = totals.totalMs - plannedScheduleMs;
  const scheduleEntriesWithPlan = scheduleEntries.filter((entry) => entry.plannedTotalMs !== null).length;
  const scheduleDiffRows = Array.from(dayStats.entries())
    .map(([dateKey, stats]) => {
      const entry = scheduleByDateKey.get(dateKey);
      const diff = getScheduleDiff(entry, { startedAt: stats.timestamp, endedAt: stats.endedAt });
      return { dateKey, stats, entry, diff };
    })
    .filter((item) => item.entry?.plannedTotalMs !== null && item.diff.totalDiffMs !== null)
    .sort((first, second) => Math.abs(second.diff.totalDiffMs || 0) - Math.abs(first.diff.totalDiffMs || 0));
  const bestWeek = Array.from(weekStats.values()).sort((first, second) => second.pay - first.pay)[0];
  const shiftTypePercentages = ['1 зміна', '2 зміна', 'Поза графіком'].map((label) => {
    const count = shiftTypes.get(label) || 0;
    const percent = reportShifts.length > 0 ? (count / reportShifts.length) * 100 : 0;
    return [label, `${count} · ${percentFormatter.format(percent)}%`] as [string, string];
  });

  const getChartValue = (stats: { pay: number; ms: number } | undefined) => {
    if (!stats) return 0;
    if (chartMode === 'hours') return stats.ms / 3600000;
    return stats.pay;
  };
  const getPlannedChartValue = (dateKey: string) => {
    if (chartMode !== 'hours') return 0;
    return (scheduleByDateKey.get(dateKey)?.plannedTotalMs || 0) / 3600000;
  };
  const getChartTitle = (date: Date, stats: DayStats | undefined) => {
    const dateKey = getDateKey(date);
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
  const maxChartValue = Math.max(
    1,
    ...Array.from(dayStats.values()).map((item) => getChartValue(item)),
    ...chartDates.map((date) => getPlannedChartValue(getDateKey(date)))
  );

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
        : (getMinutesFromTimeOfDay(shift.startedAt) - entry.plannedInMinutes) * 60000,
    outDiffMs:
      entry.plannedOutMinutes === null
        ? null
        : (getMinutesFromTimeOfDay(shift.endedAt) - entry.plannedOutMinutes) * 60000
  };
}

function formatSignedHoursMinutes(milliseconds: number | null): string {
  if (milliseconds === null) return '-';
  const sign = milliseconds > 0 ? '+' : milliseconds < 0 ? '-' : '';
  const totalMinutes = Math.floor(Math.abs(milliseconds) / 60000);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
