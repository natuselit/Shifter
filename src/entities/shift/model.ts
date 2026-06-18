import type { PayBreakdown, RateMultiplier, Shift, ShiftType } from './types';
import { getDateKey, getTimestampFromDateKey } from '@/shared/lib/date';
import { formatTimeOnly } from '@/shared/lib/format';

export { getDateKey, getTimestampFromDateKey } from '@/shared/lib/date';

type PayInput = Pick<Shift, 'startedAt' | 'endedAt' | 'rate'> &
  Partial<Pick<Shift, 'shiftType' | 'rateMultiplier' | 'doubleRate'>>;

export function createShiftId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isValidTimestamp(value: unknown): boolean {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

export function normalizeRateMultiplier(value: unknown): RateMultiplier {
  const multiplier = Number(value);
  return multiplier === 1.5 || multiplier === 2 ? multiplier : 1;
}

export function getMinutesFromDayStart(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

export function detectShiftType(timestamp: number): ShiftType {
  const minutes = getMinutesFromDayStart(timestamp);
  const firstShiftEnd = 14 * 60 + 30;
  const secondShiftEnd = 22 * 60 + 30;

  if (minutes < firstShiftEnd) return '1 зміна';
  if (minutes >= firstShiftEnd && minutes < secondShiftEnd) return '2 зміна';
  return 'Поза графіком';
}

export function normalizeShiftType(value: unknown, fallbackTimestamp = Date.now()): ShiftType {
  return value === '1 зміна' || value === '2 зміна' || value === 'Поза графіком'
    ? value
    : detectShiftType(fallbackTimestamp);
}

function hasValidRateMultiplier(shift: Record<string, unknown>): boolean {
  if (shift.rateMultiplier === undefined && shift.doubleRate === undefined) return true;
  if (shift.rateMultiplier !== undefined) {
    const multiplier = Number(shift.rateMultiplier);
    return multiplier === 1 || multiplier === 1.5 || multiplier === 2;
  }
  return typeof shift.doubleRate === 'boolean';
}

export function normalizeShiftValue(shift: unknown, index = 0, options: { strict?: boolean } = {}): Shift | null {
  if (!shift || typeof shift !== 'object') return null;

  const rawShift = shift as Record<string, unknown>;
  const startedAt = Number(rawShift.startedAt);
  const endedAt = Number(rawShift.endedAt);
  const rawRate = Number(rawShift.rate);
  const rate = Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : 0;
  const rateMultiplier = normalizeRateMultiplier(rawShift.rateMultiplier ?? (rawShift.doubleRate ? 2 : 1));

  if (
    !isValidTimestamp(startedAt) ||
    !isValidTimestamp(endedAt) ||
    endedAt < startedAt ||
    (options.strict && (!Number.isFinite(rawRate) || rawRate < 0)) ||
    !hasValidRateMultiplier(rawShift)
  ) {
    return null;
  }

  return {
    id: String(rawShift.id || `${startedAt}-${endedAt}-${index}`),
    startedAt,
    endedAt,
    rate,
    shiftType: normalizeShiftType(rawShift.shiftType, startedAt),
    rateMultiplier,
    doubleRate: rateMultiplier === 2
  };
}

export function isShiftInDateRange(shift: Shift, startKey: string, endKey: string): boolean {
  const start = getTimestampFromDateKey(startKey);
  const end = getTimestampFromDateKey(endKey, true);
  return start !== null && end !== null && shift.startedAt >= start && shift.startedAt <= end;
}

export function getShiftWindow(
  timestamp: number,
  forcedShiftType?: ShiftType
): { start: number; end: number; shiftType: ShiftType } {
  const date = new Date(timestamp);
  const shiftType = forcedShiftType || detectShiftType(timestamp);
  const start = new Date(date);
  const end = new Date(date);

  if (shiftType === '1 зміна') {
    start.setHours(6, 30, 0, 0);
    end.setHours(14, 30, 0, 0);
    return { start: start.getTime(), end: end.getTime(), shiftType };
  }

  if (shiftType === '2 зміна') {
    start.setHours(14, 30, 0, 0);
    end.setHours(22, 30, 0, 0);
    return { start: start.getTime(), end: end.getTime(), shiftType };
  }

  return { start: timestamp, end: timestamp, shiftType };
}

export function calculatePayBreakdown(shift: PayInput): PayBreakdown {
  const rate = Number(shift.rate) || 0;
  const totalMs = Math.max(0, shift.endedAt - shift.startedAt);
  const rateMultiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));

  if (rateMultiplier !== 1) {
    return {
      baseMs: 0,
      overtimeMs: 0,
      multiplierMs: totalMs,
      rateMultiplier,
      total: (totalMs / 3600000) * rate * rateMultiplier
    };
  }

  const window = getShiftWindow(shift.startedAt, shift.shiftType);
  const baseMs = Math.max(0, Math.min(shift.endedAt, window.end) - Math.max(shift.startedAt, window.start));
  const overtimeMs = Math.max(0, totalMs - baseMs);

  return {
    baseMs,
    overtimeMs,
    multiplierMs: 0,
    rateMultiplier: 1,
    total: (baseMs / 3600000) * rate + (overtimeMs / 3600000) * rate * 1.5
  };
}

export function calculatePay(shift: PayInput): number {
  return calculatePayBreakdown(shift).total;
}

export function calculateLivePay(startedAt: number | null, rate: number, rateMultiplier: RateMultiplier): number {
  if (!startedAt) return 0;
  return calculatePay({
    startedAt,
    endedAt: Date.now(),
    rate,
    rateMultiplier,
    doubleRate: rateMultiplier === 2
  });
}

export function hasShiftOnDate(shifts: Shift[], dateKey: string, ignoredShiftId: string | null = null): boolean {
  return shifts.some((shift) => shift.id !== ignoredShiftId && getDateKey(shift.startedAt) === dateKey);
}

export function getShiftCopyText(shift: Shift, surname: string): string {
  const period = `${formatTimeOnly(shift.startedAt)}-${formatTimeOnly(shift.endedAt)}`;
  return [String(surname || '').trim(), period].filter(Boolean).join(' ');
}
