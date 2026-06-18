import { createShiftId, detectShiftType, type Shift } from '@/entities/shift';
import { getDateKey, getTimestampFromDateKey, normalizeNonNegativeNumber } from '@/shared/lib';
import { readStorageItem, removeStorageItem, writeStorageItem } from '@/shared/storage';

const scheduleTextStorageKey = 'reportsScheduleText';

export interface ScheduleEntry {
  dateKey: string;
  plannedInMinutes: number | null;
  plannedOutMinutes: number | null;
  plannedTotalMs: number | null;
}

export interface ScheduleParseResult {
  entries: ScheduleEntry[];
  errors: string[];
}

export interface ScheduleDiff {
  totalDiffMs: number | null;
  inDiffMs: number | null;
  outDiffMs: number | null;
}

export interface ScheduleFactDiff {
  dateKey: string;
  diff: ScheduleDiff;
}

export interface ScheduleSyncPreview {
  entries: ScheduleEntry[];
  errors: string[];
  addedKeys: string[];
  updatedKeys: string[];
  unchangedKeys: string[];
  factDiffs: ScheduleFactDiff[];
  mergedText: string;
}

export interface ScheduleShiftSyncResult {
  shifts: Shift[];
  createdKeys: string[];
  updatedKeys: string[];
  skippedKeys: string[];
}

export function getStoredScheduleText(): string {
  return readStorageItem(scheduleTextStorageKey) || '';
}

export function saveScheduleTextValue(value: string): void {
  writeStorageItem(scheduleTextStorageKey, value);
}

export function clearStoredScheduleText(): void {
  removeStorageItem(scheduleTextStorageKey);
}

function parseDateKey(value: string): string | null {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, rawDay, rawMonth, rawYear] = match;
  const day = Number(rawDay);
  const month = Number(rawMonth);
  const year = Number(rawYear);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return getDateKey(date);
}

function parseClockMinutes(value: string): number | null {
  const normalized = value.trim();
  if (!normalized || normalized === ':') return null;

  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.NaN;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

function parseDurationMs(value: string): number | null {
  const normalized = value.trim();
  if (!normalized || normalized === ':') return null;

  const match = normalized.match(/^(\d{1,3}):(\d{2})$/);
  if (!match) return Number.NaN;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59) return Number.NaN;
  return (hours * 60 + minutes) * 60000;
}

export function parseScheduleText(text: string): ScheduleParseResult {
  const entries = new Map<string, ScheduleEntry>();
  const errors: string[] = [];
  let currentDateKey: string | null = null;

  String(text || '')
    .split(/\r?\n/)
    .forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line || /^Колонка\s+\d+:/i.test(line)) return;

      const dateMatch = line.match(/^--(.+)--$/);
      if (dateMatch) {
        const dateKey = parseDateKey(dateMatch[1].trim());
        if (!dateKey) {
          errors.push(`Рядок ${index + 1}: неправильна дата`);
          currentDateKey = null;
          return;
        }

        currentDateKey = dateKey;
        entries.set(dateKey, {
          dateKey,
          plannedInMinutes: null,
          plannedOutMinutes: null,
          plannedTotalMs: null
        });
        return;
      }

      if (!currentDateKey) return;
      const entry = entries.get(currentDateKey);
      if (!entry) return;

      const fieldMatch = line.match(/^(In time|Out time|Total):\s*(.*)$/i);
      if (!fieldMatch) return;

      const [, field, value] = fieldMatch;
      if (/^In time$/i.test(field)) {
        const minutes = parseClockMinutes(value);
        if (Number.isNaN(minutes)) errors.push(`Рядок ${index + 1}: неправильний In time`);
        else entry.plannedInMinutes = minutes;
      } else if (/^Out time$/i.test(field)) {
        const minutes = parseClockMinutes(value);
        if (Number.isNaN(minutes)) errors.push(`Рядок ${index + 1}: неправильний Out time`);
        else entry.plannedOutMinutes = minutes;
      } else {
        const durationMs = parseDurationMs(value);
        if (Number.isNaN(durationMs)) errors.push(`Рядок ${index + 1}: неправильний Total`);
        else entry.plannedTotalMs = durationMs;
      }
    });

  return { entries: Array.from(entries.values()), errors };
}

function formatDateKeyForSchedule(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  return `${day}.${month}.${year}`;
}

function formatMinutes(value: number | null): string {
  if (value === null) return '';
  const hours = String(Math.floor(value / 60)).padStart(2, '0');
  const minutes = String(value % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDuration(value: number | null): string {
  if (value === null) return ':';
  const totalMinutes = Math.floor(value / 60000);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function areEntriesEqual(first: ScheduleEntry | undefined, second: ScheduleEntry): boolean {
  return (
    Boolean(first) &&
    first?.plannedInMinutes === second.plannedInMinutes &&
    first.plannedOutMinutes === second.plannedOutMinutes &&
    first.plannedTotalMs === second.plannedTotalMs
  );
}

function hasVisibleDiff(diff: ScheduleDiff): boolean {
  return [diff.totalDiffMs, diff.inDiffMs, diff.outDiffMs].some((value) => value !== null && value !== 0);
}

export function formatScheduleEntries(entries: ScheduleEntry[]): string {
  return [...entries]
    .sort((first, second) => first.dateKey.localeCompare(second.dateKey))
    .map((entry) =>
      [
        `--${formatDateKeyForSchedule(entry.dateKey)}--`,
        `In time: ${formatMinutes(entry.plannedInMinutes)}`,
        `Out time: ${formatMinutes(entry.plannedOutMinutes)}`,
        `Total: ${formatDuration(entry.plannedTotalMs)}`
      ].join('\n')
    )
    .join('\n\n');
}

export function formatScheduleTextInput(text: string): string {
  const normalized = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*(--\d{2}\.\d{2}\.\d{4}--)\s*/g, '\n\n$1\n')
    .replace(/\s*(In time|Out time|Total):\s*/gi, (_, field: string) => `\n${field}: `)
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const result = parseScheduleText(normalized);
  return result.entries.length > 0 && result.errors.length === 0 ? formatScheduleEntries(result.entries) : normalized;
}

export function buildScheduleSyncPreview(
  currentText: string,
  incomingText: string,
  shifts: Shift[]
): ScheduleSyncPreview {
  const current = parseScheduleText(currentText);
  const incoming = parseScheduleText(incomingText);
  const currentByDate = new Map(current.entries.map((entry) => [entry.dateKey, entry]));
  const mergedByDate = new Map(current.entries.map((entry) => [entry.dateKey, entry]));
  const addedKeys: string[] = [];
  const updatedKeys: string[] = [];
  const unchangedKeys: string[] = [];
  const shiftsByDate = new Map(shifts.map((shift) => [getDateKey(shift.startedAt), shift]));
  const factDiffs: ScheduleFactDiff[] = [];

  incoming.entries.forEach((entry) => {
    const currentEntry = currentByDate.get(entry.dateKey);
    mergedByDate.set(entry.dateKey, entry);

    if (!currentEntry) addedKeys.push(entry.dateKey);
    else if (areEntriesEqual(currentEntry, entry)) unchangedKeys.push(entry.dateKey);
    else updatedKeys.push(entry.dateKey);

    const diff = getScheduleDiff(entry, shiftsByDate.get(entry.dateKey));
    if (hasVisibleDiff(diff)) factDiffs.push({ dateKey: entry.dateKey, diff });
  });

  const entries = Array.from(mergedByDate.values()).sort((first, second) =>
    first.dateKey.localeCompare(second.dateKey)
  );

  return {
    entries,
    errors: [...current.errors, ...incoming.errors],
    addedKeys,
    updatedKeys,
    unchangedKeys,
    factDiffs,
    mergedText: formatScheduleEntries(entries)
  };
}

function getTimestampFromDateKeyAndMinutes(dateKey: string, minutes: number): number | null {
  const timestamp = getTimestampFromDateKey(dateKey);
  if (timestamp === null) return null;

  const date = new Date(timestamp);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date.getTime();
}

function getShiftTimesFromScheduleEntry(entry: ScheduleEntry): { startedAt: number; endedAt: number } | null {
  if (entry.plannedInMinutes === null) return null;

  const startedAt = getTimestampFromDateKeyAndMinutes(entry.dateKey, entry.plannedInMinutes);
  if (startedAt === null) return null;

  if (entry.plannedOutMinutes !== null) {
    let endedAt = getTimestampFromDateKeyAndMinutes(entry.dateKey, entry.plannedOutMinutes);
    if (endedAt === null) return null;
    if (endedAt < startedAt) endedAt += 24 * 3600000;
    return endedAt > startedAt ? { startedAt, endedAt } : null;
  }

  if (entry.plannedTotalMs !== null && entry.plannedTotalMs > 0) {
    return { startedAt, endedAt: startedAt + entry.plannedTotalMs };
  }

  return null;
}

export function syncShiftsWithScheduleEntries(
  entries: ScheduleEntry[],
  shifts: Shift[],
  defaultRate: unknown
): ScheduleShiftSyncResult {
  const shiftsByDate = new Map(shifts.map((shift) => [getDateKey(shift.startedAt), shift]));
  const nextShiftsById = new Map(shifts.map((shift) => [shift.id, shift]));
  const createdKeys: string[] = [];
  const updatedKeys: string[] = [];
  const skippedKeys: string[] = [];
  const rate = normalizeNonNegativeNumber(defaultRate);

  entries.forEach((entry) => {
    const times = getShiftTimesFromScheduleEntry(entry);
    if (!times) {
      skippedKeys.push(entry.dateKey);
      return;
    }

    const existingShift = shiftsByDate.get(entry.dateKey);
    const shiftType = detectShiftType(times.startedAt);

    if (existingShift) {
      nextShiftsById.set(existingShift.id, {
        ...existingShift,
        startedAt: times.startedAt,
        endedAt: times.endedAt,
        shiftType
      });
      updatedKeys.push(entry.dateKey);
      return;
    }

    const nextShift: Shift = {
      id: createShiftId(),
      startedAt: times.startedAt,
      endedAt: times.endedAt,
      rate,
      shiftType,
      rateMultiplier: 1,
      doubleRate: false
    };
    nextShiftsById.set(nextShift.id, nextShift);
    createdKeys.push(entry.dateKey);
  });

  return {
    shifts: Array.from(nextShiftsById.values()).sort((first, second) => second.startedAt - first.startedAt),
    createdKeys,
    updatedKeys,
    skippedKeys
  };
}

function getMinutesFromTimeOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

export function getScheduleDiff(
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

export function formatSignedHoursMinutes(milliseconds: number | null): string {
  if (milliseconds === null) return '-';
  const sign = milliseconds > 0 ? '+' : milliseconds < 0 ? '-' : '';
  const totalMinutes = Math.floor(Math.abs(milliseconds) / 60000);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
