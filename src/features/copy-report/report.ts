import { calculatePay, type Shift } from '@/entities/shift';
import { formatDateOnly, formatHoursMinutes, formatMoney } from '@/shared/lib';

export function buildReportText({
  title,
  shifts
}: {
  title: string;
  shifts: Shift[];
}): string {
  const totalPay = shifts.reduce((sum, shift) => sum + calculatePay(shift), 0);
  const totalMs = shifts.reduce((sum, shift) => sum + Math.max(0, shift.endedAt - shift.startedAt), 0);
  const lines = [title, '', `Сума: ${formatMoney(totalPay)}`, `Години: ${formatHoursMinutes(totalMs)}`];

  lines.push(`Зміни: ${shifts.length}`, '');

  if (shifts.length === 0) {
    lines.push('Записів немає.');
  } else {
    [...shifts]
      .sort((first, second) => first.startedAt - second.startedAt)
      .forEach((shift) => {
        lines.push(
          [
            formatDateOnly(shift.startedAt),
            `${formatHoursMinutes(shift.endedAt - shift.startedAt)}`,
            formatMoney(calculatePay(shift)),
            shift.shiftType
          ].join(' · ')
        );
      });
  }

  return lines.join('\n');
}
