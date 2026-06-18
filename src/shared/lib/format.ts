import { getDateKey } from './date';

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
