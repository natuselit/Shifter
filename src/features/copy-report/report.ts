import { calculatePay, normalizeRateMultiplier } from '../../entities/shift/model';
import type { Shift } from '../../entities/shift/types';
import { formatHoursMinutes, formatMoney, formatRate, formatShiftPeriod } from '../../shared/lib/format';

export function getShiftCopyText(shift: Shift, surname: string): string {
  const period = `${new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' }).format(new Date(shift.startedAt))}-${new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' }).format(new Date(shift.endedAt))}`;
  return [String(surname || '').trim(), period].filter(Boolean).join(' ');
}

export function getReportText(shifts: Shift[], title: string, surname: string): string {
  const normalizedShifts = [...shifts].sort((first, second) => first.startedAt - second.startedAt);
  const lines: string[] = [];
  const totalMs = normalizedShifts.reduce((sum, shift) => sum + Math.max(0, shift.endedAt - shift.startedAt), 0);
  const totalPay = normalizedShifts.reduce((sum, shift) => sum + calculatePay(shift), 0);

  if (surname) lines.push(surname);
  lines.push(title, '');

  if (normalizedShifts.length === 0) {
    lines.push('Записів немає.');
  } else {
    normalizedShifts.forEach((shift) => {
      const multiplier = normalizeRateMultiplier(shift.rateMultiplier ?? (shift.doubleRate ? 2 : 1));
      lines.push(
        [
          formatShiftPeriod(shift.startedAt, shift.endedAt),
          formatHoursMinutes(shift.endedAt - shift.startedAt),
          formatRate(shift.rate),
          `x${multiplier}`,
          formatMoney(calculatePay(shift))
        ].join(' · ')
      );
    });
  }

  lines.push('', `Години: ${formatHoursMinutes(totalMs)}`, `Сума: ${formatMoney(totalPay)}`);
  return lines.join('\n');
}

export async function copyText(text: string): Promise<boolean> {
  const normalizedText = String(text || '').trim();
  if (!normalizedText) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(normalizedText);
      return true;
    }
  } catch {
    // Fall back to the legacy selection-based copy below.
  }

  if (!document.queryCommandSupported?.('copy')) return false;

  const textArea = document.createElement('textarea');
  textArea.value = normalizedText;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';
  document.body.append(textArea);
  textArea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textArea.remove();
  }
}
