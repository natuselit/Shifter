import { getDateKey } from '../../entities/shift/model';

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatHoursMinutes(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export function formatDateOnly(timestamp: number): string {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(timestamp));
}

export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(timestamp));
}

export function formatTimeOnly(timestamp: number): string {
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

export function formatShiftPeriod(startedAt: number, endedAt: number): string {
  if (getDateKey(startedAt) === getDateKey(endedAt)) {
    return `${formatShortDate(startedAt)} · ${formatTimeOnly(startedAt)}-${formatTimeOnly(endedAt)}`;
  }

  return `${formatShortDate(startedAt)} ${formatTimeOnly(startedAt)} - ${formatShortDate(endedAt)} ${formatTimeOnly(endedAt)}`;
}

export function formatDateTimeInput(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function getTimestampFromDateTimeInput(value: string): number | null {
  const normalized = String(value || '')
    .trim()
    .replace('T', ' ');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hours, minutes] = match.map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date.getTime();
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH'
  }).format(value);
}

export function formatRate(value: number): string {
  const rate = Number(value) || 0;
  return `${new Intl.NumberFormat('uk-UA', {
    maximumFractionDigits: 2
  }).format(rate)} грн/год`;
}
